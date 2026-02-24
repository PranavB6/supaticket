import type { Static } from "@fastify/type-provider-typebox";
import { TicketSchema } from "../schemas/tickets.schema.js";

export enum TicketStatus {
    OPEN = "open",
    IN_PROGRESS = "in_progress",
    RESOLVED = "resolved",
    CLOSED = "closed",
}

export type TicketRow = {
    id: string;
    title: string;
    description: string;
    priority: number;
    status: TicketStatus;
    assigned_to: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    resolved_at: string | null;
}

export type TicketResponse = Static<typeof TicketSchema>;