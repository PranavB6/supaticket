import { buildApp } from "../../src/app.js";
import { loadConfig } from "../../src/config.js";
import { getTestDatabaseConnection } from "./db-connection.js";

const config = loadConfig(process.env)


export async function buildTestApp(overrides = {}) {
    const app = buildApp({
        logger: loggerOptions(),
        db: {
            sql: getTestDatabaseConnection(),
            disconnectOnClose: false,
        },
        ...overrides,
    });

    await app.ready();

    return app;
}

function loggerOptions() {

    if (config.TEST_DEBUG_LOGS === false) {
        return false
    }

    return {
        level: 'debug',
        transport: {
            target: "pino-pretty",
            options: {
                translateTime: "SYS:standard", // <-- local system timezone
                ignore: "pid,hostname",
            },
        },
    };
}
