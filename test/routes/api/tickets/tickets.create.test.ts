import { describe, it, expect } from "vitest";
import { buildTestApp } from "../../../../test/helpers/build-test-app.js";

describe("POST /tickets", () => {
    it("returns 201 if ticket is created successfully", async () => {
        const app = await buildTestApp();

        await app.ready();

        const res = await app.inject({
            method: "POST",
            url: "/api/tickets",
            body: {
                title: "Test ticket",
                description: "Test description",
                priority: 3,
            }
        });

        expect(res.statusCode).toBe(201);
    });
});