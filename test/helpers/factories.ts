import type { Sql } from "postgres"
import { faker } from "@faker-js/faker";
import assert from "node:assert";
import type { UserSessionRow } from "../../src/types/user-sessions.type.js";
import type { UsersRow } from "../../src/types/users.type.js";
import { SESSION_ID_COOKIE_KEY } from "../../src/plugins/auth.js";
import type { FastifyInstance } from "fastify";

type CreateAuthenticatedTestUserOverrides = {
    user?: CreateUserOverrides;
    session?: CreateUserSessionOverrides;
}

export const createAuthenticatedTestUser = async (app: FastifyInstance, tx: Sql, overrides: CreateAuthenticatedTestUserOverrides = {}) => {
    const user = await createUser(tx, overrides.user);
    const session = await createUserSession(tx, { ...overrides.session, userId: user.id });

    const signed = app.signCookie(session.id);
    const cookie = `${SESSION_ID_COOKIE_KEY}=${signed}`;

    return { user, cookie };
}

type CreateUserOverrides = Partial<{
    displayName: string,
    email: string,
    password: string,
}>

export const createUser = async (tx: Sql, overrides: CreateUserOverrides = {}) => {
    const user = {
        displayName: faker.person.fullName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
        ...overrides
    }

    const [userRow] = await tx<UsersRow[]>`
        insert into users (display_name, email, password_hash)
        values (${user.displayName}, ${user.email}, ${user.password})
        returning *;
    `;

    assert.ok(userRow, "Failed to create user");

    return userRow;
}

type CreateUserSessionOverrides = Partial<{
    userId: string,
    maxAge: number,
}>

export const createUserSession = async (tx: Sql, overrides: CreateUserSessionOverrides = {}) => {
    const session = {
        userId: faker.string.uuid(),
        maxAge: 60 * 60 * 24 * 7,
        ...overrides
    }

    const [sessionRow] = await tx<UserSessionRow[]>`
        insert into user_sessions (user_id, expires_at)
        values (${session.userId}, now() + ${session.maxAge} * interval '1 second')
        returning *;
    `;

    assert.ok(sessionRow, "Failed to create session");

    return sessionRow;
}

export const createSessionCookie = (sessionId: string) => {
    return `${SESSION_ID_COOKIE_KEY}=${sessionId}`
}