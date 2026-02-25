import { describe, it, beforeAll, afterAll, expect } from "vitest";
import type { FastifyInstance } from "fastify";
import { faker } from '@faker-js/faker';
import { buildTestApp } from "../../../helpers/build-test-app.js";

let app: FastifyInstance;

beforeAll(async () => {
    app = await buildTestApp();
});

afterAll(async () => {
    await app.close();
});

describe("Users API", () => {

    it("creates a user", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/api/users",
            body: {
                displayName: faker.person.fullName(),
                email: faker.internet.email(),
                password: faker.internet.password()
            }
        });

        expect(response.statusCode).toBe(201);
    });


});

