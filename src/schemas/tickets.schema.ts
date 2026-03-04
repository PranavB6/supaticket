
import { Type } from "@fastify/type-provider-typebox";
import { TicketStatus } from "../types/tickets.type.js";

export const TicketStatusSchema = Type.Enum(TicketStatus);

// --------------------
//  Params
// --------------------
export const TicketIdParamsSchema = Type.Object(
    { ticketId: Type.String({ format: "uuid" }), updatedBy: Type.String({ format: "uuid" }) },
    { additionalProperties: false }
);

export const ListTicketsQuerySchema = Type.Object({
    status: Type.Optional(TicketStatusSchema),
    createdBy: Type.Optional(Type.String({ format: "uuid" })),
    assignedTo: Type.Optional(Type.String({ format: "uuid" })),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
    offset: Type.Optional(Type.Integer({ minimum: 0 })),
})



// --------------------
//  Bodies
// --------------------
export const CreateTicketBodySchema = Type.Object(
    {
        title: Type.String({ minLength: 3, maxLength: 200 }),
        description: Type.String({ minLength: 1, maxLength: 10_000 }),
        priority: Type.Optional(Type.Integer({ minimum: 1, maximum: 5 })),
        createdBy: Type.String({ format: "uuid" }),
    },
    { additionalProperties: false }
);

export const PatchTicketBodySchema = Type.Object({
    title: Type.Optional(Type.String({ minLength: 3, maxLength: 200 })),
    description: Type.Optional(Type.String({ minLength: 1, maxLength: 10_000 })),
    priority: Type.Optional(Type.Integer({ minimum: 1, maximum: 5 })),
    status: Type.Optional(TicketStatusSchema),
    // When assignedTo is undefined, we don't update it, if it's null, we set it to null
    assignedTo: Type.Optional(Type.Union([Type.String({ format: "uuid" }), Type.Null()])),
},
    { additionalProperties: false }
)

// --------------------
//  Responses
// --------------------
export const TicketResponseSchema = Type.Object({
    id: Type.String({ format: "uuid" }),
    title: Type.String(),
    description: Type.String(),
    priority: Type.Integer(),
    status: TicketStatusSchema,
    assignedTo: Type.Union([Type.String({ format: "uuid" }), Type.Null()]),
    createdBy: Type.String({ format: "uuid" }),
    createdAt: Type.String({ format: "date-time" }),
    updatedAt: Type.String({ format: "date-time" }),
    resolvedAt: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
})
