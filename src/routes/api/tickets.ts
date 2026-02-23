import fp from "fastify-plugin";
import type { FastifyBaseLogger } from "fastify";
import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import type postgres from "postgres";

const TicketStatus = Type.Union([
    Type.Literal("open"),
    Type.Literal("in_progress"),
    Type.Literal("resolved"),
    Type.Literal("closed"),
]);

const TicketCreateBody = Type.Object(
    {
        title: Type.String({ minLength: 3, maxLength: 200 }),
        description: Type.String({ minLength: 1, maxLength: 10_000 }),
        priority: Type.Optional(Type.Integer({ minimum: 1, maximum: 5 })),
    },
    { additionalProperties: false }
);

const TicketIdParams = Type.Object(
    { ticketId: Type.String({ format: "uuid" }) },
    { additionalProperties: false }
);

const TicketListQuery = Type.Object({
    status: Type.Optional(TicketStatus),
    createdBy: Type.Optional(Type.String({ format: "uuid" })),
    assignedTo: Type.Optional(Type.String({ format: "uuid" })),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
    offset: Type.Optional(Type.Integer({ minimum: 0 })),
})

const routes: FastifyPluginAsyncTypebox = async (app) => {
    app.post("/tickets",
        {
            schema: {
                body: TicketCreateBody,
            }
        }, async (req, reply) => {
            const ticket = await createTicket(app.sql, req.body);
            req.log.info({ ticket }, "Ticket created");

            return reply.status(201).send({ ticket });
        })

    app.get("/tickets/:ticketId",
        {
            schema: {
                params: TicketIdParams
            }
        }, async (req, reply) => {
            const ticket = await getTicketById(app.sql, req.params.ticketId);

            if (!ticket) {
                return app.httpErrors.notFound("Ticket not found");
            }

            return reply.status(200).send({ ticket });
        })

    app.get("/tickets",
        {
            schema: {
                querystring: TicketListQuery,

            },
        },
        async (req) => {
            const { rows, limit, offset } = await listTickets(app.sql, req.query)

            return {
                tickets: rows,
                page: { limit, offset },
            };
        }
    )
}

const createTicket = async (sql: postgres.Sql, data: Static<typeof TicketCreateBody>) => {
    const createdBy = "d5e4cd76-e6a6-4794-be0d-2963dd58fe78";

    const rows = await sql`
        insert into tickets (created_by, title, description, priority)
        values (
            ${createdBy},
            ${data.title},
            ${data.description},
            ${data.priority ?? 3}
        )
        returning *;
    `;

    return rows[0];
}

const getTicketById = async (sql: postgres.Sql, ticketId: string) => {
    const rows = await sql`
        select *
        from tickets
        where id = ${ticketId}
        limit 1;
    `;

    return rows[0] ?? null;
}

const listTickets = async (sql: postgres.Sql, options: Static<typeof TicketListQuery>) => {

    const limit = options.limit ?? 10;
    const offset = options.offset ?? 0;

    const conditions: any[] = [];

    if (options.status) {
        conditions.push(sql`status = ${options.status}`);
    }

    if (options.createdBy) {
        conditions.push(sql`created_by = ${options.createdBy}`);
    }

    if (options.assignedTo) {
        conditions.push(sql`assigned_to = ${options.assignedTo}`);
    }

    const where = conditions.length > 0
        ? sql`where ${conditions.reduce((acc, curr) => sql`${acc} AND ${curr}`)}`
        : sql``;

    const rows = await sql`
        select *
        from tickets
        ${where}
        order by created_at desc
        limit ${limit}
        offset ${offset}
    `;

    return { rows, limit, offset };;
}

export default routes;
