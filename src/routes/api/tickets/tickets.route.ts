import { type FastifyPluginAsyncTypebox, type Static, Type } from "@fastify/type-provider-typebox";
import type postgres from "postgres";
import { tx } from "../../../db/tx.js";
import { CreateTicketBodySchema, ListTicketsQuerySchema, TicketIdParamsSchema, PatchTicketBodySchema } from "../../../schemas/tickets.schema.js";
import { type TicketResponse } from "../../../types/ticket-response.type.js";
import { TicketStatus } from "../../../types/ticket-status.type.js";
import { type TicketRow } from "../../../types/ticket-row.type.js";


const routes: FastifyPluginAsyncTypebox = async (app) => {
    app.post("/",
        {
            schema: {
                body: CreateTicketBodySchema,
            }
        }, async (req, reply) => {
            const ticket = await createTicket(app.sql, req.body);
            req.log.info({ ticket }, "Ticket created");

            return reply.status(201).send({ ticket });
        })

    app.get("/",
        {
            schema: {
                querystring: ListTicketsQuerySchema,
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

    app.get("/:ticketId",
        {
            schema: {
                params: TicketIdParamsSchema
            }
        }, async (req, reply) => {
            const row = await getTicketById(app.sql, req.params.ticketId);

            if (!row) {
                return app.httpErrors.notFound("Ticket not found");
            }

            const ticket = mapTicket(row);

            return reply.status(200).send({ ticket });
        })



    app.patch("/:ticketId", {
        schema: {
            params: TicketIdParamsSchema,
            body: PatchTicketBodySchema,
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

    app.delete("/:ticketId", {
        schema: {
            params: TicketIdParamsSchema,
        }
    }, async (req, reply) => {
        const deleted = await deleteTicket(app.sql, req.params.ticketId);

        if (!deleted) {
            return app.httpErrors.notFound("Ticket not found");
        }

        return reply.status(204).send();
    })
}

const listTickets = async (sql: postgres.Sql, options: Static<typeof ListTicketsQuerySchema>) => {

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

    const rows = await sql<TicketRow[]>`
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
    const rows = await sql<TicketRow[]>`
        select *
        from tickets
        where id = ${ticketId}
        limit 1;
    `;

    return rows[0] ?? null;
}

const createTicket = async (sql: postgres.Sql, data: Static<typeof CreateTicketBodySchema>) => {
    const createdBy = "d5e4cd76-e6a6-4794-be0d-2963dd58fe78";

    const rows = await sql<TicketRow[]>`
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
const TicketPatchFields = Type.KeyOf(PatchTicketBodySchema);
type TicketPatchData = { [key in Static<typeof TicketPatchFields>]: any };

const updateTicket = async (sql: postgres.Sql, ticketId: string, data: TicketPatchData) => {
    const rows = await sql<TicketRow[]>`
        update tickets
        set
            title = ${data.title},
            description = ${data.description},
            priority = ${data.priority},
            status = ${data.status},
            assigned_to = ${data.assignedTo},
            resolved_at = case
                when ${data.status} = ${TicketStatus.RESOLVED} and resolved_at is null then now()
                when ${data.status} <> ${TicketStatus.RESOLVED} then null
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


const mapTicket = (ticket: TicketRow): TicketResponse => {
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
