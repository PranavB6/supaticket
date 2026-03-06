import type { FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type postgres from "postgres";

interface AuthenticatedUser {
    id: string;
    email: string;
}

type AuthenticatedRequest = FastifyRequest & {
    user: AuthenticatedUser;
};

declare module "fastify" {
    interface FastifyRequest {
        user: AuthenticatedUser | null;
    }
    interface FastifyInstance {
        requireAuth: (req: FastifyRequest, reply: any) => Promise<void>;
    }
}

export const SESSION_ID_COOKIE_KEY = "session-id";

export const authPlugin = fp(
    async (app) => {
        app.decorateRequest("user", null);

        app.decorate("requireAuth", async (req) => {
            if (!req.user) {
                throw app.httpErrors.unauthorized();
            }
        });

        app.addHook("preHandler", async (req) => {
            const rawSessionCookie = req.cookies[SESSION_ID_COOKIE_KEY];
            if (!rawSessionCookie) {
                req.log.debug("Session cookie not found in request")
                return;
            };

            const sessionCookie = req.unsignCookie(rawSessionCookie);
            if (!sessionCookie.valid) {
                req.log.debug("Session cookie signature is invalid")
                return
            };

            const sessionId = sessionCookie.value;
            if (!sessionId) {
                req.log.debug("Session cookie value is falsy")
                return
            };

            const row = await getUserBySessionId(app.sql, sessionId);
            if (!row) {
                // The session id from the cookie does not match 
                // There is no valid session in the database that correspondes to a cookie
                // 
                req.log.debug("Session cookie provided but session not found, expired, or revoked")
                return
            };

            req.user = {
                id: row.user_id,
                email: row.email,
            };
        })
    },
    { name: "auth", dependencies: ["config", "cookies", "sensible"] }
);

const getUserBySessionId = async (tx: postgres.Sql, sessionId: string) => {
    const [row] = await tx<{ user_id: string, email: string }[]>`
        select u.id as user_id, u.email
        from user_sessions s
        join users u on s.user_id = u.id
        where 
            s.id = ${sessionId}::uuid
            and s.expires_at > now()
            and s.revoked_at is null
        limit 1
    `;

    return row;
}