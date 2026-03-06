import { type FastifyPluginAsyncTypebox, type Static, Type } from "@fastify/type-provider-typebox";
import type postgres from "postgres";
import { CreateTicketBodySchema, ListTicketsQuerySchema, TicketIdParamsSchema, PatchTicketBodySchema } from "../../../schemas/tickets.schema.js";
import { transaction } from "../../../db/transaction.js";
import { type TicketResponse, type TicketRow, TicketStatus } from "../../../types/tickets.type.js";
import assert from "node:assert";


const routes: FastifyPluginAsyncTypebox = async (app) => {
    app.post("/",
        {
            schema: {
                body: CreateTicketBodySchema,
            },
            preHandler: [app.requireAuth],
        }, async (req, reply) => {
            const user = req.user;
            assert.ok(user, "Require auth must set user");

            const ticketRow = await transaction(app.sql, async (tx) => {

                const ticket = await createTicket(tx, {
                    title: req.body.title,
                    description: req.body.description,
                    priority: req.body.priority ?? 3,
                    createdBy: user.id
                });

                assert.ok(ticket, "Create ticket must return a row");


                await createTicketEvent(tx, {
                    ticketId: ticket.id,
                    actorId: user.id,
                    type: 'ticket.created',
                    requestId: req.id,
                    payload: req.body
                });

                return ticket;
            })

            const ticket = toTicketResponse(ticketRow);

            req.log.info({ ticket }, "Ticket created");

            return reply.status(201).send(ticket);
        })

    app.get("/",
        {
            preHandler: [app.requireAuth],
            schema: {
                querystring: ListTicketsQuerySchema,
            },
        },
        async (req) => {
            const { rows, limit, offset } = await listTickets(app.sql, req.query)

            const tickets = rows.map(toTicketResponse);

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
            },
            preHandler: [app.requireAuth],
        }, async (req, reply) => {
            const row = await getTicketById(app.sql, req.params.ticketId);

            if (!row) {
                throw app.httpErrors.notFound("Ticket not found");
            }

            const ticket = toTicketResponse(row);

            return reply.status(200).send(ticket);
        })



    app.patch("/:ticketId",
        {
            preHandler: [app.requireAuth],
            schema: {
                params: TicketIdParamsSchema,
                body: PatchTicketBodySchema,
            }
        }, async (req) => {
            const user = req.user;
            assert.ok(user, "Require auth must set user");

            req.log.info({ body: req.body }, "Body after validation");

            const updatedTicket = await transaction(app.sql, async (tx) => {
                const existingRow = await selectTicketForUpdate(tx, req.params.ticketId);

                if (!existingRow) return null;

                const existingTicket = toTicketResponse(existingRow);

                const stagedTicket = {
                    title: req.body.title ?? existingTicket.title,
                    description: req.body.description ?? existingTicket.description,
                    priority: req.body.priority ?? existingTicket.priority,
                    status: req.body.status ?? existingTicket.status,
                    // if assignedTo is undefined, we don't update it, if it's null, we set it to null
                    assignedTo: req.body.assignedTo === undefined ? existingTicket.assignedTo : req.body.assignedTo,
                }

                const ticketDiff = calculateTicketDifference(existingTicket, stagedTicket);

                const updatedTicket = await updateTicket(tx, req.params.ticketId, stagedTicket);

                assert.ok(updatedTicket, "Update ticket must return a row");

                await createTicketEvent(tx, {
                    ticketId: updatedTicket.id,
                    actorId: user.id,
                    type: 'ticket.updated',
                    requestId: req.id,
                    payload: {
                        diff: ticketDiff,
                    }
                });

                return updatedTicket;
            })

            if (!updatedTicket) {
                throw app.httpErrors.notFound("Ticket not found");
            }

            const ticketResponse = toTicketResponse(updatedTicket);

            req.log.info({ ticket: ticketResponse }, "Ticket updated");

            return ticketResponse;
        })

    app.delete("/:ticketId",
        {
            preHandler: [app.requireAuth],
            schema: {
                params: TicketIdParamsSchema,
            }
        }, async (req, reply) => {
            const user = req.user;
            assert.ok(user, "Require auth must set user");

            const deleted = await transaction(app.sql, async (tx) => {
                const existingTicket = await selectTicketForUpdate(tx, req.params.ticketId);

                if (!existingTicket) {
                    return null;
                }

                await deleteTicket(tx, req.params.ticketId);

                await createTicketEvent(tx, {
                    ticketId: existingTicket.id,
                    actorId: user.id,
                    type: 'ticket.deleted',
                    requestId: req.id,
                    payload: {}
                });

                return existingTicket;
            });

            if (!deleted) {
                throw app.httpErrors.notFound("Ticket not found");
            }

            return reply.status(204).send();
        })
}

const listTickets = async (tx: postgres.Sql, options: Static<typeof ListTicketsQuerySchema>) => {

    const limit = options.limit ?? 10;
    const offset = options.offset ?? 0;

    const conditions: any[] = [];

    if (options.status) {
        conditions.push(tx`status = ${options.status}`);
    }

    if (options.createdBy) {
        conditions.push(tx`created_by = ${options.createdBy}`);
    }

    if (options.assignedTo) {
        conditions.push(tx`assigned_to = ${options.assignedTo}`);
    }

    const where = conditions.length > 0
        ? tx`where ${conditions.reduce((acc, curr) => tx`${acc} AND ${curr}`)}`
        : tx``;

    const rows = await tx<TicketRow[]>`
        select *
        from tickets
        ${where}
        order by created_at desc
        limit ${limit}
        offset ${offset}
    `;

    return { rows, limit, offset };;
}

const getTicketById = async (tx: postgres.Sql, ticketId: string) => {
    const rows = await tx<TicketRow[]>`
        select *
        from tickets
        where id = ${ticketId}
        limit 1;
    `;

    return rows[0] ?? null;
}

const selectTicketForUpdate = async (tx: postgres.Sql, ticketId: string) => {
    const rows = await tx<TicketRow[]>`
        select *
        from tickets
        where id = ${ticketId}
        limit 1
        for update;
    `;

    return rows[0] ?? null;
}

type CreateTicketData = {
    createdBy: string;
    title: string;
    description: string;
    priority: number;
}

const createTicket = async (tx: postgres.Sql, data: CreateTicketData) => {
    const rows = await tx<TicketRow[]>`
        insert into tickets (created_by, title, description, priority)
        values (
            ${data.createdBy},
            ${data.title},
            ${data.description},
            ${data.priority}
        )
        returning *;
    `;

    return rows[0];
}



interface TicketUpdateData {
    title: string;
    description: string;
    priority: number;
    status: TicketStatus;
    assignedTo: string | null;
}

const updateTicket = async (tx: postgres.Sql, ticketId: string, data: TicketUpdateData) => {
    const rows = await tx<TicketRow[]>`
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

    return rows[0];
}

const deleteTicket = async (tx: postgres.Sql, ticketId: string) => {
    const rows = await tx`
        delete from tickets
        where id = ${ticketId}
        returning *;
    `;

    return rows[0] ?? null;
}


const createTicketEvent = async (tx: postgres.Sql, event: { ticketId: string, actorId: string, type: string, requestId: string, payload: any }) => {
    const rows = await tx`
        insert into ticket_events (ticket_id, actor_id, type, request_id, payload)
        values (${event.ticketId}, ${event.actorId}, ${event.type}, ${event.requestId}, ${event.payload})
        returning *;
    `;

    return rows[0];
}

const calculateTicketDifference = (oldTicket: any, newTicket: any) => {
    const changed: Record<string, { from: any; to: any }> = {};

    for (const key of Object.keys(newTicket)) {
        const from = oldTicket[key];
        const to = newTicket[key];

        if (from !== to) {
            changed[key] = { from, to };
        }
    }

    return changed;
}

const toTicketResponse = (ticket: TicketRow): TicketResponse => {
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
