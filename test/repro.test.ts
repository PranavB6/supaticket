import { it, expect } from "vitest";
import { buildTestApp } from "./helpers/build-test-app.js";

it("should build app", async () => {
    const app = await buildTestApp();

    expect(app).toBeDefined();

    await app.close();
});
