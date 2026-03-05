import fp from "fastify-plugin";
import cookie from "@fastify/cookie";


export const cookiesPlugin = fp(
    async (app) => {
        app.register(cookie, {
            secret: [app.config.COOKIE_SECRET, app.config.COOKIE_SECRET_FALLBACK],
            hook: "onRequest",
            parseOptions: {
                maxAge: app.config.SESSION_MAX_AGE,
                httpOnly: true,
                secure: app.config.NODE_ENV === "production",
                sameSite: "strict",
                signed: true,
                path: "/"
            }
        });
    },
    { name: "cookies", dependencies: ["config"] }
);
