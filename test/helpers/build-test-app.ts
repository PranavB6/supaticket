import { buildApp } from "../../src/app.js";
import { getTestDatabaseConnection } from "./db-connection.js";

type Overrides = {
    logger?: boolean;
};


export async function buildTestApp(overrides: Overrides = {}) {
    const app = buildApp({
        logger: false,
        db: {
            sql: getTestDatabaseConnection(),
            disconnectOnClose: false,
        },
        ...overrides,
    });

    await app.ready();

    return app;
}