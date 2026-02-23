import fp from "fastify-plugin";
import type { FastifyBaseLogger } from "fastify";
import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";
import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import type postgres from "postgres";
import { tx } from "../../db/tx.js";


const TicketStatusEnum = {
    OPEN: "open",
    IN_PROGRESS: "in_progress",
    RESOLVED: "resolved",
    CLOSED: "closed",
}

const TicketStatus = Type.Enum(TicketStatusEnum);

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

const TicketPatchBody = Type.Object({
    title: Type.Optional(Type.String({ minLength: 3, maxLength: 200 })),
    description: Type.Optional(Type.String({ minLength: 1, maxLength: 10_000 })),
    priority: Type.Optional(Type.Integer({ minimum: 1, maximum: 5 })),
    status: Type.Optional(TicketStatus),
    // When assignedTo is undefined, we don't update it, if it's null, we set it to null
    assignedTo: Type.Optional(Type.Union([Type.String({ format: "uuid" }), Type.Null()])),
},
    { additionalProperties: false }
)


const TicketResponse = Type.Object({
    id: Type.String({ format: "uuid" }),
    title: Type.String(),
    description: Type.String(),
    priority: Type.Integer(),
    status: TicketStatus,
    assignedTo: Type.Optional(Type.String({ format: "uuid" })),
    createdBy: Type.String({ format: "uuid" }),
    createdAt: Type.String({ format: "date-time" }),
    updatedAt: Type.String({ format: "date-time" }),
    resolvedAt: Type.Optional(Type.String({ format: "date-time" })),
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

    app.get("/tickets",
        {
            schema: {
                querystring: TicketListQuery,

            },
        },
        async (req) => {
            const { rows, limit, offset } = await listTickets(app.sql, req.query)

            const tickets = rows.map(mapTicket);

            return {
                tickets,
                page: { limit, offset },
            };
        }
    )

    app.get("/tickets/:ticketId",
        {
            schema: {
                params: TicketIdParams
            }
        }, async (req, reply) => {
            const row = await getTicketById(app.sql, req.params.ticketId);

            if (!row) {
                return app.httpErrors.notFound("Ticket not found");
            }

            const ticket = mapTicket(row);

            return reply.status(200).send({ ticket });
        })



    app.patch("/tickets/:ticketId", {
        schema: {
            params: TicketIdParams,
            body: TicketPatchBody,
        }
    }, async (req) => {
        req.log.info({ body: req.body }, "Body after validation");

        const updatedTicket = await tx(app.sql, async (trx) => {
            const existingRow = await getTicketById(trx, req.params.ticketId);

            if (!existingRow) return null;

            const existingTicket = mapTicket(existingRow);

            const toUpdate = {
                title: req.body.title ?? existingTicket.title,
                description: req.body.description ?? existingTicket.description,
                priority: req.body.priority ?? existingTicket.priority,
                status: req.body.status ?? existingTicket.status,
                // if assignedTo is undefined, we don't update it, if it's null, we set it to null
                assignedTo: req.body.assignedTo === undefined ? existingTicket.assignedTo : req.body.assignedTo,
            }

            return await updateTicket(trx, req.params.ticketId, toUpdate);
        })

        if (!updatedTicket) {
            return app.httpErrors.notFound("Ticket not found");
        }

        req.log.info({ ticket: updatedTicket }, "Ticket updated");

        return { ticket: updatedTicket };
    })

    app.delete("/tickets/:ticketId", {
        schema: {
            params: TicketIdParams,
        }
    }, async (req, reply) => {
        const deleted = await deleteTicket(app.sql, req.params.ticketId);

        if (!deleted) {
            return app.httpErrors.notFound("Ticket not found");
        }

        return reply.status(204).send();
    })
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

const getTicketById = async (sql: postgres.Sql, ticketId: string) => {
    const rows = await sql`
        select *
        from tickets
        where id = ${ticketId}
        limit 1;
    `;

    return rows[0] ?? null;
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

// In order to update the ticket, we want to accept an object where all the updatable fields are MANDATORY
// So we create a new type from the TicketPatchBody by taking the keys of the TicketPatchBody and making the values 'any'
const TicketPatchFields = Type.KeyOf(TicketPatchBody);
type TicketPatchData = { [key in Static<typeof TicketPatchFields>]: any };

const updateTicket = async (sql: postgres.Sql, ticketId: string, data: TicketPatchData) => {
    const rows = await sql`
        update tickets
        set
            title = ${data.title},
            description = ${data.description},
            priority = ${data.priority},
            status = ${data.status},
            assigned_to = ${data.assignedTo},
            resolved_at = case
                when ${data.status} = ${TicketStatusEnum.RESOLVED} and resolved_at is null then now()
                when ${data.status} <> ${TicketStatusEnum.RESOLVED} then null
                else resolved_at
            end,
            updated_at = now()
        where id = ${ticketId}
        returning *;
    `;

    return rows;
}

const deleteTicket = async (sql: postgres.Sql, ticketId: string) => {
    const rows = await sql`
        delete from tickets
        where id = ${ticketId}
        returning *;
    `;

    return rows[0] ?? null;
}

const mapTicket = (ticket: any) => {
    return {
        id: ticket.id,
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        assignedTo: ticket.assigned_to,
        createdBy: ticket.created_by,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
        resolvedAt: ticket.resolved_at,
    };
}

export default routes;
