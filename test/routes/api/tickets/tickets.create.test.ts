import { describe, it, beforeAll, afterAll, expect, beforeEach } from "vitest";
import { buildTestApp } from "../../../../test/helpers/build-test-app.js";
import type { FastifyInstance } from "fastify";
import { injectAndExpectStatus } from "../../../helpers/inject-and-expect-status.js";

import { createAuthenticatedTestUser } from "../../../helpers/factories.js";
import { resetTestDatabaseData } from "../../../helpers/db-connection.js";

let app: FastifyInstance;

beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
});

beforeEach(async () => {
    await resetTestDatabaseData(app.sql);
});

afterAll(async () => {
    await app.close();
});



describe("Create Tickets", () => {

    it("creates a ticket", async () => {
        const title = "Test ticket";
        const description = "Test description";
        const priority = 3;

        const { user, cookie } = await createAuthenticatedTestUser(app, app.sql);

        const response = await injectAndExpectStatus(app, {
            method: "POST",
            url: "/api/tickets",
            headers: {
                cookie: cookie
            },
            body: {
                title,
                description,
                priority,
            },

        }, 201);

        const responseBody = response.json();

        expect(responseBody.title).toBe(title);
        expect(responseBody.description).toBe(description);
        expect(responseBody.priority).toBe(priority);
        expect(responseBody.createdBy).toBe(user.id);
        expect(responseBody.id).toBeDefined();


    });

    it("rejects unauthenticated ticket creation", async () => {
        await injectAndExpectStatus(app, {
            method: "POST",
            url: "/api/tickets",
            body: {
                title: "Test ticket",
                description: "Test description",
                priority: 3,
            }
        }, 401);
    });
});


