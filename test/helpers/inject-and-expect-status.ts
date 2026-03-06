import type { FastifyInstance, InjectOptions } from "fastify";
import { expect } from "vitest";

export async function injectAndExpectStatus(
    app: FastifyInstance,
    opts: InjectOptions,
    expectedStatus: number
) {
    const res = await app.inject(opts);

    let message = "";

    if (res.statusCode !== expectedStatus) {
        message += `Response status: ${res.statusCode} \n`;
        message += `Request: ${JSON.stringify(opts)} \n`;
        message += `Response body: ${JSON.stringify(res.json())}`;
    }

    expect(res.statusCode, message).toBe(expectedStatus);

    return res;
}

function safeJson(body: string) {
    try {
        return JSON.parse(body);
    } catch {
        return body;
    }
}