import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

export const swaggerPlugin: FastifyPluginAsync = fp(
    async (app) => {
        await app.register(swagger, {
            openapi: {
                info: {
                    title: "Fastify Practice API",
                    version: "0.1.0"
                }
            }
        });

        await app.register(swaggerUi, {
            routePrefix: "/docs"
        });

        app.addHook("onReady", () => {
            app.log.info("Swagger docs available at /docs");
        });
    },
    { name: "swagger" }
);
