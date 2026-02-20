import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import type { AppConfig } from "../config.js";
import { loadConfig } from "../config.js";

declare module "fastify" {
    interface FastifyInstance {
        config: AppConfig;
    }
}

export const configPlugin: FastifyPluginAsync = fp(
    async (app) => {
        const config = loadConfig(process.env);
        app.decorate("config", config);

        app.addHook("onListen", async () => {
            app.log.info("Node environment is %s", app.config.NODE_ENV);
        });

    },
    { name: "config" }
);
