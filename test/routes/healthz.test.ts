import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { buildTestApp } from "../helpers/build-test-app.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeAll(async () => {
    app = await buildTestApp();
});

afterAll(async () => {
    await app.close();
});

describe("Health checks", () => {

    it("is healthy", async () => {

        const response = await app.inject({
            method: "GET",
            url: "/healthz",
        });

        expect(response.statusCode).toBe(200);
    });

    it("is ready", async () => {

        const response = await app.inject({
            method: "GET",
            url: "/readyz",
        });

        expect(response.statusCode).toBe(200);
    });
});

