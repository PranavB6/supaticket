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

describe("Delete Tickets", () => {
    it("deletes a ticket", async () => {
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

        await injectAndExpectStatus(app, {
            method: "DELETE",
            url: `/api/tickets/${createdTicket.id}`,
            headers: {
                cookie: cookie
            },
        }, 204);

        const getResponse = await injectAndExpectStatus(app, {
            method: "GET",
            url: `/api/tickets/${createdTicket.id}`,
            headers: {
                cookie: cookie
            },
        }, 404);
    });
});


