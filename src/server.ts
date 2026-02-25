import { buildApp } from "./app.js";
import closeWithGrace from 'close-with-grace'
import { loadConfig } from "./config.js";
import postgres from "postgres";

const config = loadConfig(process.env);
const app = buildApp({ logger: loggerOptions(), db: { sql: createDatabaseConnection() } });

async function start() {
    try {
        await app.ready();
        await app.listen({ host: app.config.HOST, port: app.config.PORT });

    } catch (err) {
        app.log.error({ err }, "Failed to start server");
        process.exit(1);
    }
}

/**
 * Configure logger options based on environment.
 * Since this function will only be called in development or production (server.ts is not called in test),
 * we can safely ignore other environments
 */
function loggerOptions() {
    if (config.NODE_ENV === 'production') {
        return {
            level: config.LOG_LEVEL
        };
    }

    // Otherwise, we are in development mode
    return {
        level: config.LOG_LEVEL,
        transport: {
            target: "pino-pretty",
            options: {
                translateTime: "SYS:standard", // <-- local system timezone
                ignore: "pid,hostname",
            },
        },
    };
}

function createDatabaseConnection() {
    return postgres(config.DATABASE_URL, {
        ssl: config.NODE_ENV === "production" ? "require" : false,
        max: 10,
        idle_timeout: 20,
        debug: ((_connection, query, params, _types) => {
            const q = query.replace(/\s+/g, " ").trim();
            app.log.debug({ query: q, params }, "Database query");
        })
    });
}

closeWithGrace({ delay: 10_000 }, async function ({ signal, err, manual }) {
    if (err) {
        app.log.error({ err }, "Server closing with error");
    } else {
        app.log.info({ signal }, "Server shutting down");
    }
    await app.close();
})

await start();
