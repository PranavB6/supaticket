import type { Static } from "@fastify/type-provider-typebox";
import { TicketSchema } from "../schemas/tickets.schema.js";

export type TicketResponse = Static<typeof TicketSchema>;   