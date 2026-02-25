import type { Sql } from "postgres"
import { faker } from "@faker-js/faker";
import assert from "node:assert";

export const createUser = async (tx: Sql, overrides: any = {}) => {
    const user = {
        displayName: faker.person.fullName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
        ...overrides
    }

    const [userRow] = await tx`
        insert into users (display_name, email, password_hash)
        values (${user.displayName}, ${user.email}, ${user.password})
        returning *;
    `;

    assert(userRow, "Failed to create user");

    return userRow;
}