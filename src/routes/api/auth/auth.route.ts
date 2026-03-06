import { type FastifyPluginAsyncTypebox, type Static, Type } from "@fastify/type-provider-typebox";
import type postgres from "postgres";
import { transaction } from "../../../db/transaction.js";
import assert from "node:assert";
import { SESSION_ID_COOKIE_KEY } from "../../../plugins/auth.js";
import argon2 from "argon2";
import type { UsersRow } from "../../../types/users.type.js";
import type { UserSessionRow } from "../../../types/user-sessions.type.js";

const RegisterUserSchema = Type.Object({
    displayName: Type.String(),
    email: Type.String(),
    password: Type.String(),
})

const LoginUserSchema = Type.Object({
    email: Type.String(),
    password: Type.String(),
})


const routes: FastifyPluginAsyncTypebox = async (app) => {

    app.post("/register", { schema: { body: RegisterUserSchema } }, async (req, reply) => {

        const { email, password, displayName } = req.body;
        const passwordHash = await hashPassword(password);

        const { user, sessionId } = await transaction(app.sql, async (tx) => {
            const userRow = await createUser(tx, { displayName, email, passwordHash });
            assert.ok(userRow, "Create user must return a row");

            const user = toUserResponse(userRow);

            const sessionRow = await createUserSession(tx, { userId: userRow.id, maxAge: app.config.SESSION_MAX_AGE });
            assert.ok(sessionRow, "Create session must return a row");

            return { user: user, sessionId: sessionRow.id };
        });

        reply.setCookie(SESSION_ID_COOKIE_KEY, sessionId);

        return reply.status(201).send(user);
    })

    app.post("/login", {
        schema: {
            body: LoginUserSchema
        }
    }, async (req, reply) => {
        const { email, password } = req.body;

        const userRow = await getUserByEmail(app.sql, email);

        if (!userRow) {
            throw app.httpErrors.unauthorized("Invalid credentials");
        }

        const isPasswordValid = await verifyPassword(userRow.password_hash, password);
        if (!isPasswordValid) {
            throw app.httpErrors.unauthorized("Invalid credentials");
        }

        const sessionRow = await createUserSession(app.sql, { userId: userRow.id, maxAge: app.config.SESSION_MAX_AGE });
        assert.ok(sessionRow, "Create session must return a row");

        reply.setCookie(SESSION_ID_COOKIE_KEY, sessionRow.id);

        const user = toUserResponse(userRow);

        return user;
    })

    app.post("/logout", async (req, reply) => {

        const rawSessionCookie = req.cookies[SESSION_ID_COOKIE_KEY];

        if (rawSessionCookie) {
            const sessionIdCookie = req.unsignCookie(rawSessionCookie);

            if (sessionIdCookie.valid) {
                const sessionId = sessionIdCookie.value;
                const deletedSessionRow = await revokeUserSession(app.sql, sessionId);

                if (deletedSessionRow) {
                    app.log.info({ sessionId }, `Session revoked`);

                } else {
                    app.log.warn({ sessionId }, `Could not revoke session`);
                }
            }
        }


        reply.clearCookie(SESSION_ID_COOKIE_KEY);
        return reply.status(204).send();
    })


}

const createUser = async (tx: postgres.Sql, user: { displayName: string, email: string, passwordHash: string }) => {
    const [userRow] = await tx<[UsersRow?]>`
        insert into users (display_name, email, password_hash)
        values (${user.displayName}, ${user.email}, ${user.passwordHash})
        returning *;
    `;

    return userRow;
}

const createUserSession = async (tx: postgres.Sql, sessionInfo: { userId: string, maxAge: number }) => {
    const [sessionRow] = await tx<[UserSessionRow?]>`
        insert into user_sessions (user_id, expires_at)
        values (${sessionInfo.userId}, now() + ${sessionInfo.maxAge} * interval '1 second')
        returning *;
    `;

    return sessionRow;
}

const revokeUserSession = async (tx: postgres.Sql, sessionId: string) => {
    const [sessionRow] = await tx<[UserSessionRow?]>`
        update user_sessions 
        set revoked_at = now()
        where id = ${sessionId}::uuid
        returning *;
    `;

    return sessionRow;
}

const getUserByEmail = async (tx: postgres.Sql, email: string) => {
    const [userRow] = await tx<[UsersRow?]>`
        select * 
        from users 
        where email = ${email}
        limit 1
    `;

    return userRow;
}



const hashPassword = async (password: string): Promise<string> => {
    const hash = await argon2.hash(password, { type: argon2.argon2id });
    return hash;
}

const verifyPassword = async (passwordHash: string, password: string): Promise<boolean> => {
    return await argon2.verify(passwordHash, password);
}

const toUserResponse = (user: any) => {
    return {
        id: user.id,
        displayName: user.display_name,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        updatedAt: user.updated_at
    }
}




export default routes;



