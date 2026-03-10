// scripts/migrate.ts
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import crypto from "node:crypto";

const MIGRATIONS_DIR = path.join(process.cwd(), "db/migrations");
const MIGRATIONS_TABLE = "new_migrations";

export interface MigrationOptions {
    databaseUrl?: string;
    shouldReset?: boolean;
    shouldCreateDb?: boolean;
    isVerbose?: boolean;
}

export async function ensureDatabaseExists(url: string, isVerbose: boolean) {
    const targetUrl = new URL(url);
    const dbName = targetUrl.pathname.slice(1);
    if (!dbName) return;

    // Connect to the 'postgres' database to create the target database
    const controlUrl = new URL(url);
    controlUrl.pathname = "/postgres";

    const controlSql = postgres(controlUrl.toString(), { max: 1 });

    try {
        const results = await controlSql`
      SELECT 1 FROM pg_database WHERE datname = ${dbName}
    `;

        if (results.length === 0) {
            if (isVerbose) console.log(`Creating database ${dbName}...`);
            await controlSql.unsafe(`CREATE DATABASE "${dbName}"`);
            if (isVerbose) console.log(`Database ${dbName} created.`);
        }
    } finally {
        await controlSql.end();
    }
}

export async function dropAllWorkerDatabases(url: string, isVerbose: boolean = false) {
    const controlUrl = new URL(url);
    controlUrl.pathname = "/postgres";

    const controlSql = postgres(controlUrl.toString(), { max: 1 });

    try {
        const databases = await controlSql`
            SELECT datname FROM pg_database WHERE datname LIKE '%\_worker\_%'
        `;

        for (const { datname } of databases) {
            if (isVerbose) console.log(`Dropping database ${datname}...`);
            await controlSql.unsafe(`DROP DATABASE "${datname}"`);
            if (isVerbose) console.log(`Database ${datname} dropped.`);
        }
    } finally {
        await controlSql.end();
    }
}

function listMigrationFiles(dir: string) {
    if (!fs.existsSync(dir)) return [];

    return fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".sql"))
        .sort();
}

function sha256(input: string) {
    return crypto.createHash("sha256").update(input).digest("hex");
}

export async function migrate(options: MigrationOptions = {}) {
    const databaseUrl = options.databaseUrl || process.env.TEST_DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("Missing database URL. Provide it in options or set TEST_DATABASE_URL env var.");
    }

    const { shouldReset = false, shouldCreateDb = false, isVerbose = false } = options;

    if (shouldCreateDb) {
        await ensureDatabaseExists(databaseUrl, isVerbose);
    }

    const sql = postgres(databaseUrl, {
        ssl: false,
        max: 10,
        onnotice: (notice) => {
            // Supress the notice when trying to create the migration table if it already exists
            if (notice.code === "42P07") {
                if (isVerbose) {
                    console.log(notice.message);
                }
                return;
            }
            console.log(notice);
        }
    });

    try {
        if (shouldReset) {
            if (isVerbose) console.log("⚠️  Resetting database...");
            await sql`DROP SCHEMA public CASCADE;`;
            await sql`CREATE SCHEMA public;`;
            if (isVerbose) console.log("✓ Database reset complete.");
        }

        await sql`
            CREATE TABLE IF NOT EXISTS ${sql(MIGRATIONS_TABLE)} (
              id TEXT PRIMARY KEY,
              run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
              checksum TEXT NOT NULL
            )
        `;

        const files = listMigrationFiles(MIGRATIONS_DIR);
        if (files.length === 0) {
            if (isVerbose) console.log("No migrations found.");
            return;
        }

        let appliedCount = 0;
        for (const file of files) {
            const fullPath = path.join(MIGRATIONS_DIR, file);
            const contents = fs.readFileSync(fullPath, "utf8");
            const checksum = sha256(contents);

            // Verify checksum if exists
            const existing = await sql`
                SELECT checksum FROM ${sql(MIGRATIONS_TABLE)} WHERE id = ${file}
            `;

            if (existing.length > 0) {
                const row = existing[0];
                if (row && row.checksum !== checksum) {
                    throw new Error(
                        `Migration modified after execution: ${file}\n` +
                        `Create a new migration instead of editing old ones.`
                    );
                }
                if (isVerbose) console.log(`✓ Skipping ${file}`);
                continue;
            }

            if (isVerbose) console.log(`→ Running ${file}`);

            await sql.begin(async (trx) => {
                const tx = trx as unknown as postgres.Sql;
                await tx.unsafe(contents);
                await tx`
                    INSERT INTO ${tx(MIGRATIONS_TABLE)} (id, checksum)
                    VALUES (${file}, ${checksum})
                `;
            });

            appliedCount++;
            if (isVerbose) console.log(`✓ Completed ${file}`);
        }

        if (appliedCount > 0) {
            console.log(`Successfully applied ${appliedCount} migration${appliedCount === 1 ? "" : "s"}.`);
        } else {
            console.log("All migrations already applied.");
        }
    } finally {
        await sql.end({ timeout: 5 });
    }
}

export default async function main() {
    const shouldReset = process.argv.includes("--reset");
    const shouldCreateDb = process.argv.includes("--create-db");
    const isVerbose = process.argv.includes("--verbose") || process.argv.includes("-v") || import.meta.url.startsWith('file:');

    try {
        await migrate({
            shouldReset,
            shouldCreateDb,
            isVerbose
        });
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

// This block ONLY runs if you execute the file directly
if (import.meta.url.startsWith('file:')) {
    const modulePath = new URL(import.meta.url).pathname;
    if (process.argv[1] === modulePath) {
        main();
    }
}