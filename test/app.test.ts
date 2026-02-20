import { describe, it, expect } from "vitest";
import { buildApp } from "../src/app.js";

describe("app", () => {
    it("GET / returns ok", async () => {
        const app = buildApp({ logger: false });
        await app.ready();

        const res = await app.inject({ method: "GET", url: "/" });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ ok: true, env: "development" });

        await app.close();
    });
});
