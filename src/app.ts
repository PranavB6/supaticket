import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { randomUUID } from "node:crypto";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { loggerPlugin } from "./plugins/logger.js";
import { requestIdPlugin } from "./plugins/request-id.js";
import { swaggerPlugin } from "./plugins/swagger.js";
import { configPlugin } from "./plugins/config.js";
import { dbPlugin } from "./plugins/db.js";
import fastifyAutoload from "@fastify/autoload";
import { fileURLToPath } from "node:url";
import { sensiblePlugin } from "./plugins/sensible.js";
import type { DbPluginOptions } from "./plugins/db.js";

interface AppOptions extends FastifyServerOptions {
    db?: DbPluginOptions;
}


export function buildApp(opts: AppOptions = {}): FastifyInstance {
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
    app.register(dbPlugin, opts.db ?? {});
    app.register(requestIdPlugin)
    app.register(loggerPlugin)
    app.register(swaggerPlugin);

    // autoload routes
    const routesDir = fileURLToPath(new URL("./routes", import.meta.url));
    app.log.debug({ routesDir }, "Autoloading routes");
    app.register(fastifyAutoload, {
        dir: routesDir,
        dirNameRoutePrefix: true,
    });

    app.addHook("onListen", () => {
        app.log.info(`Routes:\n${app.printRoutes()}`);
    });

    return app;
}
