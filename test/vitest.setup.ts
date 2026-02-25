import { afterAll } from "vitest";
import { closeTestDatabaseConnection } from "./helpers/db-connection.js";

afterAll(async () => {
    await cleanup();
});


async function cleanup() {
    await closeTestDatabaseConnection();
}