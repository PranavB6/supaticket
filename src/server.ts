import { buildApp } from "./app.js";
import closeWithGrace from 'close-with-grace'
import { loadConfig } from "./config.js";

const app = buildApp({ logger: loggerOptions() });

async function start() {
    try {
        await app.ready();
        await app.listen({ host: app.config.HOST, port: app.config.PORT });

    } catch (err) {
        app.log.error({ err }, "Failed to start server");
        process.exit(1);
    }
}

function loggerOptions() {
    const config = loadConfig(process.env);

    if (config.NODE_ENV === 'production') {
        return {
            level: config.LOG_LEVEL
        };

    } else if (config.NODE_ENV === 'test') {
        return false;
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

closeWithGrace({ delay: 10_000 }, async function ({ signal, err, manual }) {
    if (err) {
        app.log.error({ err }, "Server closing with error");
    } else {
        app.log.info({ signal }, "Server shutting down");
    }
    await app.close();
})

await start();
