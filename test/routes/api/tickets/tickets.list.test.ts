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

describe("List Tickets", () => {
    it("gets a tickey by id", async () => {
        const title = "Test ticket";
        const description = "Test description";
        const priority = 3;

        const { user, cookie } = await createAuthenticatedTestUser(app, app.sql);

        const createResponse = await injectAndExpectStatus(app, {
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

        const createdTicket = createResponse.json();

        const getResponse = await injectAndExpectStatus(app, {
            method: "GET",
            url: `/api/tickets/${createdTicket.id}`,
            headers: {
                cookie
            }
        }, 200);

        const getResponseBody = getResponse.json();
        expect(getResponseBody.id).toBe(createdTicket.id);
        expect(getResponseBody.title).toBe(title);
        expect(getResponseBody.description).toBe(description);
        expect(getResponseBody.priority).toBe(priority);
        expect(getResponseBody.createdBy).toBe(user.id);

    })
});


