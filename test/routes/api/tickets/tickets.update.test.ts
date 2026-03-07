import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { buildTestApp } from "../../../../test/helpers/build-test-app.js";
// import { getTestDatabaseConnection } from "../../../helpers/db-connection.js";
import type { FastifyInstance } from "fastify";
import { injectAndExpectStatus } from "../../../helpers/inject-and-expect-status.js";

import { createAuthenticatedTestUser } from "../../../helpers/factories.js";

let app: FastifyInstance;

beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
});

afterAll(async () => {
    await app.close();
});

describe("Update Tickets", () => {
    it("updates a ticket", async () => {
        const originalTitle = "Original title";
        const originalDescription = "Original description";
        const originalPriority = 3;

        const updatedTitle = "Updated title";
        const updatedStatus = "resolved";

        const sql = app.sql;
        const { user, cookie } = await createAuthenticatedTestUser(app, sql);

        const createResponse = await injectAndExpectStatus(app, {
            method: "POST",
            url: "/api/tickets",
            headers: {
                cookie: cookie
            },
            body: {
                title: originalTitle,
                description: originalDescription,
                priority: originalPriority,
            },
        }, 201);

        const createdTicket = createResponse.json();

        const patchResponse = await injectAndExpectStatus(app, {
            method: "PATCH",
            url: `/api/tickets/${createdTicket.id}`,
            headers: {
                cookie: cookie
            },
            body: {
                title: updatedTitle,
                status: updatedStatus,
            },
        }, 200);

        const updatedTicket = patchResponse.json();

        expect(updatedTicket.id).toBe(createdTicket.id);
        expect(updatedTicket.title).toBe(updatedTitle);
        expect(updatedTicket.description).toBe(originalDescription);
        expect(updatedTicket.priority).toBe(originalPriority);
        expect(updatedTicket.status).toBe(updatedStatus);
        expect(updatedTicket.createdBy).toBe(user.id);
        expect(updatedTicket.resolvedAt).toBeDefined();
    });

    it("returns 404 when patching a missing ticket", async () => {
        const sql = app.sql;
        const { user, cookie } = await createAuthenticatedTestUser(app, sql);

        await injectAndExpectStatus(app, {
            method: "PATCH",
            url: "/api/tickets/11111111-1111-1111-1111-111111111111",
            headers: {
                cookie,
            },
            body: {
                title: "Updated title",
            },
        }, 404);
    });

    it("rejects unauthenticated ticket updates", async () => {
        await injectAndExpectStatus(app, {
            method: "PATCH",
            url: "/api/tickets/11111111-1111-1111-1111-111111111111",
            body: {
                title: "Updated title",
            },
        }, 401);
    });
});


