import { dropAllWorkerDatabases, migrate } from "../db/scripts/migrate.js";
import { loadConfig } from "../src/config.js";

const config = loadConfig(process.env);

export default async function () {
    const databaseUrl = config.TEST_DATABASE_URL;

    if (!config.TEST_USE_WORKER_DATABASES && databaseUrl) {
        console.log("\n🚀 Running one-time migrations on shared database...");
        await migrate({
            databaseUrl,
            shouldCreateDb: true,
            isVerbose: config.TEST_DEBUG_LOGS
        });
    }

    return async () => {
        if (config.TEST_USE_WORKER_DATABASES && databaseUrl) {
            console.log("\n🧹 Cleaning up worker databases...");
            await dropAllWorkerDatabases(databaseUrl, config.TEST_DEBUG_LOGS);
            console.log("🧹 Worker databases cleaned up.");
        }
    };
}
