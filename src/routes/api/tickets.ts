import fp from "fastify-plugin";
import type { FastifyBaseLogger } from "fastify";
import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import type postgres from "postgres";

const TicketCreateBody = Type.Object(
    {
        title: Type.String({ minLength: 3, maxLength: 200 }),
        description: Type.String({ minLength: 1, maxLength: 10_000 }),
        priority: Type.Optional(Type.Integer({ minimum: 1, maximum: 5 })),
    },
    { additionalProperties: false }
);

const routes: FastifyPluginAsyncTypebox = async (app) => {
    app.post("/tickets", {
        schema: {
            body: TicketCreateBody,
        }
    }, async (req, reply) => {
        const ticket = await createTicket(app.sql, req.body);

        req.log.info({ ticket }, "Ticket created");
        return reply.status(201).send({ ticket });
    })
}

const createTicket = async (sql: postgres.Sql, data: Static<typeof TicketCreateBody>) => {
    const createdBy = "d5e4cd76-e6a6-4794-be0d-2963dd58fe78";

    return await sql`
        insert into tickets (created_by, title, description, priority)
        values (
            ${createdBy},
            ${data.title},
            ${data.description},
            ${data.priority ?? 3}
        )
        returning *;
    `;

}

export default routes;
