import type { Sql } from "postgres";
import { loadConfig } from "../../src/config.js";
import postgres from "postgres";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let sql: Sql | null = null;

export function getTestDatabaseConnection() {
    if (sql) {
        return sql;
    }

    const config = loadConfig(process.env);
    const testDatabaseUrl = getWorkerDatabaseUrl(config.TEST_DATABASE_URL);

    if (!testDatabaseUrl) {
        throw new Error("TEST_DATABASE_URL is not set");
    }

    assertSafeTestDatabaseUrl(testDatabaseUrl);

    sql = postgres(testDatabaseUrl, {
        ssl: false,
        max: 10,
        idle_timeout: 20
    });

    return sql;
}

export async function closeTestDatabaseConnection() {
    if (sql === null) {
        return;
    }

    await sql.end({ timeout: 5 });
    sql = null;
}

export async function resetTestDatabaseData(tx: Sql) {
    await tx.file(path.join(__dirname, "../../db/scripts/reset_data.sql"));
}


function assertSafeTestDatabaseUrl(urlString: string) {
    const safeHosts = ["localhost", "127.0.0.1"];

    const url = new URL(urlString);

    if (!safeHosts.includes(url.hostname)) {
        throw new Error(`Refusing to connect to a non-local database: ${url.hostname}`);
    }
}

export function getWorkerDatabaseUrl(baseUrl?: string) {
    const config = loadConfig(process.env);
    const url = baseUrl || config.TEST_DATABASE_URL;
    if (!url) return url;

    // Only use worker-specific databases if the toggle is enabled
    if (!config.TEST_USE_WORKER_DATABASES) return url;

    const workerId = process.env.VITEST_WORKER_ID;
    if (!workerId) return url;

    try {
        const parsedUrl = new URL(url);
        // Remove trailing slash if it exists to avoid double slash
        const pathname = parsedUrl.pathname.endsWith('/') ? parsedUrl.pathname.slice(0, -1) : parsedUrl.pathname;
        parsedUrl.pathname = `${pathname}_worker_${workerId}`;
        return parsedUrl.toString();
    } catch (e) {
        return url;
    }
}