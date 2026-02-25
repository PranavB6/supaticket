import fp from "fastify-plugin";
import type { AppConfig } from "../config.js";
import { loadConfig } from "../config.js";

declare module "fastify" {
    interface FastifyInstance {
        config: AppConfig;
    }
}

export const configPlugin = fp(
    async (app) => {
        const config = loadConfig(process.env);
        app.decorate("config", config);

        app.addHook("onListen", async () => {
            app.log.info("Node environment is %s", app.config.NODE_ENV);
            app.log.info("Log level is %s", app.config.LOG_LEVEL);
        });

    },
    { name: "config" }
);
