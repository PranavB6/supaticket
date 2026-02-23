import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import postgres from "postgres";

declare module "fastify" {
    interface FastifyInstance {
        sql: postgres.Sql;
    }
}

export const dbPlugin: FastifyPluginAsync = fp(
    async (app) => {
        const sql = postgres(app.config.DATABASE_URL, {
            ssl: "require",
            max: 10,
            idle_timeout: 20,
            debug: ((_connection, query, params, _types) => {
                const q = query.replace(/\s+/g, " ").trim();
                app.log.debug({ query: q, params }, "Database query");
            })
        });

        app.decorate("sql", sql);

        app.addHook("onClose", async (instance) => {
            instance.log.info("Closing database connection...");
            try {
                await sql.end({ timeout: 5 });
                instance.log.info("Database connection closed");
            } catch (err) {
                instance.log.error({ err }, "Failed to close database connection");
            }
        });
    },
    {
        name: "db",
        dependencies: ["config"]
    }
);
