import { describe, it, expect } from "vitest";
import { buildTestApp } from "../../../../test/helpers/build-test-app.js";
import { getTestDatabaseConnection } from "../../../helpers/db-connection.js";
import { createUser } from "../../../helpers/factories.js";

describe("Tickets API", () => {
    it("creates a ticket", async () => {
        const app = await buildTestApp();
        await app.ready();

        const sql = getTestDatabaseConnection();
        const userRow = await createUser(sql);

        const res = await app.inject({
            method: "POST",
            url: "/api/tickets",
            body: {
                title: "Test ticket",
                description: "Test description",
                priority: 3,
                createdBy: userRow.id,
            }
        });

        expect(res.statusCode).toBe(201);
    });
});