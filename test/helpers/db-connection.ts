import type { Sql } from "postgres";
import { loadConfig } from "../../src/config.js";
import postgres from "postgres";

let sql: Sql | null = null;

export function getTestDatabaseConnection() {
    if (sql) {
        return sql;
    }

    const config = loadConfig(process.env);
    const testDatabaseUrl = config.TEST_DATABASE_URL;

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


function assertSafeTestDatabaseUrl(urlString: string) {

    const safeHosts = ["localhost", "127.0.0.1"];

    const url = new URL(urlString);

    if (!safeHosts.includes(url.hostname)) {
        throw new Error(`Refusing to connect to a non-local database: ${url.hostname}`);
    }
}