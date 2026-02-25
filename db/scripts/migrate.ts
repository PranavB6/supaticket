// scripts/migrate.ts
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import crypto from "node:crypto";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

if (!TEST_DATABASE_URL) {
    console.error("Missing TEST_DATABASE_URL env var");
    process.exit(1);
}

const MIGRATIONS_DIR = path.join(process.cwd(), "db/migrations");
const MIGRATIONS_TABLE = "new_migrations";
const shouldReset = process.argv.includes("--reset");

const sql = postgres(TEST_DATABASE_URL, {
    ssl: false,
    max: 10,
});

function listMigrationFiles(dir: string) {
    if (!fs.existsSync(dir)) return [];

    return fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".sql"))
        .sort();
}

async function resetDatabase() {
    console.log("⚠️  Resetting database...");
    await sql`
    DROP SCHEMA public CASCADE;
  `;
    await sql`
    CREATE SCHEMA public;
  `;
    console.log("✓ Database reset complete.");
}

async function ensureMigrationsTable() {
    await sql`
    CREATE TABLE IF NOT EXISTS ${sql(MIGRATIONS_TABLE)} (
      id TEXT PRIMARY KEY,
      run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      checksum TEXT NOT NULL
    )
  `;
}

function sha256(input: string) {
    return crypto.createHash("sha256").update(input).digest("hex");
}

async function hasRun(id: string) {
    const rows = await sql`
    SELECT 1 FROM ${sql(MIGRATIONS_TABLE)} WHERE id = ${id}
  `;
    return rows.length > 0;
}

async function verifyChecksumIfExists(id: string, checksum: string) {
    const rows = await sql`
    SELECT checksum FROM ${sql(MIGRATIONS_TABLE)} WHERE id = ${id}
  `;
    if (rows.length === 0) return;

    if (rows[0].checksum !== checksum) {
        throw new Error(
            `Migration modified after execution: ${id}\n` +
            `Create a new migration instead of editing old ones.`
        );
    }
}

async function run() {
    if (shouldReset) {
        await resetDatabase();
    }

    await ensureMigrationsTable();

    const files = listMigrationFiles(MIGRATIONS_DIR);
    if (files.length === 0) {
        console.log("No migrations found.");
        return;
    }

    for (const file of files) {
        const fullPath = path.join(MIGRATIONS_DIR, file);
        const contents = fs.readFileSync(fullPath, "utf8");
        const checksum = sha256(contents);

        await verifyChecksumIfExists(file, checksum);

        if (await hasRun(file)) {
            console.log(`✓ Skipping ${file}`);
            continue;
        }

        console.log(`→ Running ${file}`);

        await sql.begin(async (trx) => {
            const tx = trx as unknown as postgres.Sql;
            await tx.unsafe(contents);
            await tx`
        INSERT INTO ${tx(MIGRATIONS_TABLE)} (id, checksum)
        VALUES (${file}, ${checksum})
      `;
        });

        console.log(`✓ Completed ${file}`);
    }

    console.log("All migrations applied.");
}

run()
    .then(async () => {
        await sql.end({ timeout: 5 });
    })
    .catch(async (err) => {
        console.error(err);
        await sql.end({ timeout: 5 });
        process.exit(1);
    });