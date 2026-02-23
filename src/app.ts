import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { randomUUID } from "node:crypto";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { loggerPlugin } from "./plugins/logger.js";
import { requestIdPlugin } from "./plugins/request-id.js";
import { swaggerPlugin } from "./plugins/swagger.js";
import { configPlugin } from "./plugins/config.js";
import { dbPlugin } from "./plugins/db.js";
import fastifyAutoload from "@fastify/autoload";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sensiblePlugin } from "./plugins/sensible.js";
export function buildApp(opts: FastifyServerOptions = {}): FastifyInstance {
    const app = Fastify({
        // defaults
        logger: true,

        // user options
        ...opts,

        // hardcoded options
        // TODO: understand what this option really does
        trustProxy: true,
        disableRequestLogging: true,
        // forceCloseConnections forces the server to close connections immediately when fastify.close() is called
        // This is useful for graceful shutdown
        // Otherwise, fastify waits for all active connections to close (keepAliveTimeout) which is 72 seconds by default
        forceCloseConnections: true,
        genReqId: (req) => {
            const incoming = req.headers["x-request-id"];
            return typeof incoming === "string" && incoming.length > 0 ? incoming : randomUUID();
        }
    }).withTypeProvider<TypeBoxTypeProvider>();;


    // register plugins
    app.register(sensiblePlugin);
    app.register(configPlugin);
    app.register(dbPlugin);
    app.register(requestIdPlugin)
    app.register(loggerPlugin)
    app.register(swaggerPlugin);

    // autoload routes
    app.register(fastifyAutoload, {
        dir: path.join(import.meta.dirname, "routes"),
        dirNameRoutePrefix: true,
    });

    app.addHook("onListen", () => {
        app.log.info(`Routes:\n${app.printRoutes()}`);
    });

    return app;
}
