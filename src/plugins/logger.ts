import fp from "fastify-plugin";
import { PrecisionTimer } from "../utils/timer.js";

export const loggerPlugin = fp(
    async (app) => {
        app.addHook("onRequest", async (req) => {
            (req as any)._timer = new PrecisionTimer();
        });

        app.addHook("onResponse", async (req, reply) => {
            const responseLatencyMs = (req as any)._timer?.elapsed();

            req.log.info(
                {
                    method: req.method,
                    url: req.url,
                    statusCode: reply.statusCode,
                    responseLatencyMs
                },
                "Request completed"
            );
        });

        app.addHook("onError", async (req, reply, err) => {
            req.log.error(
                {
                    method: req.method,
                    url: req.url,
                    statusCode: reply.statusCode,
                    err
                },
                "Request failed"
            );
        });
    },
    { name: "logger", dependencies: ["request-id"] }
);
