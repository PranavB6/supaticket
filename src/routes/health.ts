import fp from "fastify-plugin";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";

const routes: FastifyPluginAsyncTypebox = async (app) => {
    app.get("/healthz", async () => {
        return { ok: true };
    });

    app.get("/readyz", async (req) => {
        try {
            const rows = await app.sql`select 1 as ok`;
            return { ready: rows[0]?.ok === 1 };

        } catch (err) {
            req.log.error({ err }, "Readiness check failed");
            return app.httpErrors.serviceUnavailable("Database not ready");
        }
    });
}


export default routes;