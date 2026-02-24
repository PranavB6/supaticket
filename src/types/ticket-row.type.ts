import type { TicketStatus } from "./ticket-status.type.js";

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