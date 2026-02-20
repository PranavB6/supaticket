import fp from "fastify-plugin";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from "@fastify/type-provider-typebox";

const RootResponseSchema = Type.Object({
    ok: Type.Boolean(),
    env: Type.String()
});

const routes: FastifyPluginAsyncTypebox = async (app) => {
    app.get("/", {
        schema: {
            response: {
                200: RootResponseSchema
            }
        }
    },
        async () => ({ ok: true, env: app.config.NODE_ENV })
    );
}

export default routes;