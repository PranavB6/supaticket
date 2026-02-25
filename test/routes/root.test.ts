import { describe, it, expect } from "vitest";
import { buildTestApp } from "../helpers/build-test-app.js";

describe("app", () => {
    it("GET / returns ok", async () => {
        const app = await buildTestApp();
        await app.ready();

        const res = await app.inject({ method: "GET", url: "/" });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ ok: true, env: "test" });

        await app.close();
    });
});
