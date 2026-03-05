import fp from "fastify-plugin";
import type postgres from "postgres";

declare module "fastify" {
    interface FastifyRequest {
        user: { id: string; email: string } | null;
    }
    interface FastifyInstance {
        requireAuth: (req: FastifyRequest, reply: any) => Promise<any>;
    }
}

export const SESSION_ID_COOKIE_KEY = "session-id";

export const authPlugin = fp(
    async (app) => {
        app.decorateRequest("user", null);

        app.decorate("requireAuth", async (req) => {
            app.log.info("Auth check");
            if (!req.user) {
                throw app.httpErrors.unauthorized();
            }
        });

        app.addHook("preHandler", async (req) => {
            const rawSessionCookie = req.cookies[SESSION_ID_COOKIE_KEY];
            if (!rawSessionCookie) {
                app.log.warn("No session cookie found");
                return;
            };

            const sessionCookie = req.unsignCookie(rawSessionCookie);
            if (!sessionCookie) {
                app.log.warn("Invalid session cookie");
                return;
            };

            const sessionId = sessionCookie.value;
            if (!sessionId) {
                app.log.warn("No session ID found");
                return;
            };

            const row = await getUserBySessionId(app.sql, sessionId);
            if (!row) {
                app.log.warn("No user found for session ID");
                return;
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
        from user_sessions session
        join users u on session.user_id = u.id
        where 
            session.id = ${sessionId}::uuid
            and session.expires_at > now()
            and session.revoked_at is null
        limit 1
    `;

    return row;
}