import { afterAll, beforeAll } from "vitest";
import { closeTestDatabaseConnection, getWorkerDatabaseUrl } from "./helpers/db-connection.js";
import { migrate } from "../db/scripts/migrate.js";
import { loadConfig } from "../src/config.js";

const config = loadConfig(process.env);

// This runs once per worker process
beforeAll(async () => {
    // Only run per-worker migrations if enabled
    if (config.TEST_USE_WORKER_DATABASES) {
        const databaseUrl = getWorkerDatabaseUrl();
        if (databaseUrl) {
            await migrate({
                databaseUrl,
                shouldCreateDb: true,
                isVerbose: config.TEST_DEBUG_LOGS
            });
        }
    }
});

afterAll(async () => {
    await cleanup();
});


async function cleanup() {
    await closeTestDatabaseConnection();
}