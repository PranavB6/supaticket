import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { type Sql } from "postgres";

declare module "fastify" {
    interface FastifyInstance {
        sql: Sql;
    }
}

export interface DbPluginOptions {
    sql?: Sql | undefined;
    disconnectOnClose?: boolean | undefined;
}

export const dbPlugin = fp<DbPluginOptions>(
    async (app, { sql, disconnectOnClose = true }) => {
        if (!sql) {
            throw new Error("Database connection not provided");
        }

        app.decorate("sql", sql);

        app.addHook("onClose", async (instance) => {
            if (disconnectOnClose === false) {
                return;
            }

            instance.log.info("Closing database connection...");
            try {
                await instance.sql.end({ timeout: 5 });
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
