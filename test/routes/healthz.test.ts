// test/perf/app-lifecycle.perf.test.ts
import { describe, it, beforeAll, afterAll, beforeEach, afterEach, expect } from "vitest";
import { buildTestApp } from "../helpers/build-test-app.js";

import type { FastifyInstance, InjectOptions } from "fastify";

export async function requestAndExpectStatus(
    app: FastifyInstance,
    opts: InjectOptions,
    expectedStatus: number
) {
    const res = await app.inject(opts);

    let message = "";

    if (res.statusCode !== expectedStatus) {
        message += `Request: ${JSON.stringify(opts)} \n`;
        message += `Response status: ${res.statusCode} \n`;
        message += `Response body: ${res.body}`;
    }

    expect(res.statusCode, message).toBe(expectedStatus);
}

function safeJson(body: string) {
    try {
        return JSON.parse(body);
    } catch {
        return body;
    }
}

function nowMs() {
    const [s, ns] = process.hrtime();
    return s * 1000 + ns / 1e6;
}

describe("Fastify app lifecycle perf", () => {
    it("A) build+close per test (10x)", async () => {
        const t0 = nowMs();
        for (let i = 0; i < 100; i++) {
            const app = await buildTestApp();
            await requestAndExpectStatus(app, {
                method: "POST",
                url: "/api/tickets",
                body: {
                    title: "Test ticket",
                    description: "Test description",
                    priority: 3,
                }
            }, 201);

            await app.close();
        }
        const t1 = nowMs();
        // Just log timing; assertion is optional.
        // eslint-disable-next-line no-console
        console.log("A) build+close per test:", (t1 - t0).toFixed(1), "ms");
        expect(true).toBe(true);
    });

    it("B) build once, reuse (10x inject)", async () => {
        const app = await buildTestApp();
        const t0 = nowMs();
        for (let i = 0; i < 100; i++) {
            await requestAndExpectStatus(app, {
                method: "POST",
                url: "/api/tickets",
                body: {
                    title: "Test ticket",
                    description: "Test description",
                    priority: 3,
                }
            }, 201);
        }
        const t1 = nowMs();
        // console.log("B) build once, reuse:", (t1 - t0).toFixed(1), "ms");
        await app.close();
        expect(true).toBe(true);
    });

    it("C) build once, reuse (10x inject)", async () => {
        const app = await buildTestApp();
        const t0 = nowMs();
        for (let i = 0; i < 100; i++) {
            await requestAndExpectStatus(app, {
                method: "POST",
                url: "/api/tickets",
                body: {
                    title: "Test ticket",
                    description: "Test description",
                    priority: 3,
                }
            }, 201);
        }
        const t1 = nowMs();
        // console.log("B) build once, reuse:", (t1 - t0).toFixed(1), "ms");
        await app.close();
        expect(true).toBe(true);
    });
});

// describe("C) build once + per-test tx rollback (pattern)", () => {
//     let app: any;

//     beforeAll(async () => {
//         app = await buildTestApp();
//     });

//     afterAll(async () => {
//         await app.close();
//     });

//     beforeEach(async () => {
//         // app.db must be a client that supports BEGIN/ROLLBACK
//         await app.sql`BEGIN`;
//     });

//     afterEach(async () => {
//         await app.sql`ROLLBACK`;
//     });

//     it("example test 1", async () => {
//         const res = await app.inject({ method: "GET", url: "/healthz" });
//         expect(res.statusCode).toBe(200);
//     });

//     it("example test 2", async () => {
//         const res = await app.inject({ method: "GET", url: "/healthz" });
//         expect(res.statusCode).toBe(200);
//     });
// });