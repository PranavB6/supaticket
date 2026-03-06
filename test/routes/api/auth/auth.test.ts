import type { FastifyInstance } from "fastify";
import { describe, beforeAll, afterAll, it, expect } from "vitest";
import { buildTestApp } from "../../../helpers/build-test-app.js";
import { faker } from "@faker-js/faker";
import { injectAndExpectStatus } from "../../../helpers/inject-and-expect-status.js";

let app: FastifyInstance;

beforeAll(async () => {
    app = await buildTestApp();
    await app.ready();
});

afterAll(async () => {
    await app.close();
});

describe("Auth Routes", () => {

    describe("/register", () => {
        it("registers a user", async () => {
            const email = faker.internet.email();
            const password = faker.internet.password();
            const displayName = faker.person.fullName();

            const registerResponse = await injectAndExpectStatus(app, {
                method: "POST",
                url: "/api/auth/register",
                body: {
                    email,
                    password,
                    displayName
                }
            }, 201);

            const registeredUser = registerResponse.json();
            expect(registeredUser.email).toBe(email);
            expect(registeredUser.displayName).toBe(displayName);

            const setCookieHeader = registerResponse.headers["set-cookie"];
            expect(setCookieHeader).toBeTruthy();
        })
    })

    describe("/login", () => {
        it("logs in a user", async () => {
            const email = faker.internet.email();
            const password = faker.internet.password();
            const displayName = faker.person.fullName();

            const registerResponse = await injectAndExpectStatus(app, {
                method: "POST",
                url: "/api/auth/register",
                body: {
                    email,
                    password,
                    displayName
                }
            }, 201);

            const loginResponse = await injectAndExpectStatus(app, {
                method: "POST",
                url: "/api/auth/login",
                body: {
                    email,
                    password
                }
            }, 200);

            const loggedInUser = loginResponse.json();
            expect(loggedInUser.email).toBe(email);
            expect(loggedInUser.displayName).toBe(displayName);

            const setCookieHeader = loginResponse.headers["set-cookie"];
            expect(setCookieHeader).toBeTruthy();
        })

        it("returns 401 for invalid credentials", async () => {
            const email = faker.internet.email();
            const password = faker.internet.password();
            const displayName = faker.person.fullName();

            const registerResponse = await injectAndExpectStatus(app, {
                method: "POST",
                url: "/api/auth/register",
                body: {
                    email,
                    password,
                    displayName
                }
            }, 201);

            await injectAndExpectStatus(app, {
                method: "POST",
                url: "/api/auth/login",
                body: {
                    email,
                    password: faker.internet.password()
                }
            }, 401);
        })
    })

    describe("/logout", () => {
        it("logs out a user", async () => {
            const email = faker.internet.email();
            const password = faker.internet.password();
            const displayName = faker.person.fullName();

            const registerResponse = await injectAndExpectStatus(app, {
                method: "POST",
                url: "/api/auth/register",
                body: {
                    email,
                    password,
                    displayName
                }
            }, 201);

            const loginResponse = await injectAndExpectStatus(app, {
                method: "POST",
                url: "/api/auth/login",
                body: {
                    email,
                    password
                }
            }, 200);

            const logoutResponse = await injectAndExpectStatus(app, {
                method: "POST",
                url: "/api/auth/logout",
                headers: {
                    cookie: loginResponse.headers["set-cookie"]
                }
            }, 204);
        })
    })

    describe("Protected Routes", () => {
        it("allows an authenticated user to access a protected route", async () => {
            const email = faker.internet.email();
            const password = faker.internet.password();
            const displayName = faker.person.fullName();

            const registerResponse = await injectAndExpectStatus(app, {
                method: "POST",
                url: "/api/auth/register",
                body: {
                    email,
                    password,
                    displayName
                }
            }, 201);

            const loginResponse = await injectAndExpectStatus(app, {
                method: "POST",
                url: "/api/auth/login",
                body: {
                    email,
                    password
                }
            }, 200);

            const protectedResponse = await injectAndExpectStatus(app, {
                method: "GET",
                url: "/api/tickets",
                headers: {
                    cookie: loginResponse.headers["set-cookie"]
                }
            }, 200);
        })

        it("rejects access to a protected route for an unauthenticated user", async () => {
            const protectedResponse = await injectAndExpectStatus(app, {
                method: "GET",
                url: "/api/tickets",
            }, 401);
        })
    })
})