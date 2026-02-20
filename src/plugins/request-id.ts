import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

declare module "fastify" {
    interface FastifyRequest {
        requestId: string;
    }
}

export const requestIdPlugin: FastifyPluginAsync = fp(
    async (app) => {
        app.addHook("onRequest", async (req, reply) => {

            const _req = req as any; // Makes typing easier for this function
            _req.requestId = req.id; // req.id is Fastify's request id

            _req.log = req.log.child({ requestId: _req.requestId }); // Adds requestId to the logger
            reply.header("x-request-id", _req.requestId); // Adds requestId to the response header
        });
    },
    { name: "request-id" }
);
