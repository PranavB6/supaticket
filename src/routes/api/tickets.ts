import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { tx } from "../../db/tx.js";

const CreateTicketBody = Type.Object(
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
            body: CreateTicketBody,
        }
    }, async (req, reply) => {

        const createdBy = "d5e4cd76-e6a6-4794-be0d-2963dd58fe78";

        try {
            const rows = await app.sql`
                insert into tickets (created_by, title, description, priority)
                values (
                    ${createdBy},
                    ${req.body.title},
                    ${req.body.description},
                    ${req.body.priority ?? 3}
                )
                returning *;
            `;

            req.log.info({ ticket: rows[0] }, "Ticket created");
            req.log.error("No error here")

            return reply.status(201).send({ ticket: rows[0] });

        } catch (err) {
            req.log.error({ err }, "Failed to create ticket");
            return app.httpErrors.internalServerError("Failed to create ticket");
        }

    })
}

export default routes;
