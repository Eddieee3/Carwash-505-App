import { z } from "zod";
import type { TicketKind } from "@/shared/database";

export const TICKET_KINDS = ["pre_existing_damage", "complaint", "other"] as const satisfies readonly TicketKind[];
export const MAX_TICKET_PHOTOS = 3;

// Mismos límites que support_tickets (migración 9).
export const ticketSchema = z.object({
  kind: z.enum(TICKET_KINDS),
  description: z.string().trim().min(10, "too_short").max(2000, "too_long"),
  bookingId: z.string().uuid().nullable(),
});

export type TicketInput = z.infer<typeof ticketSchema>;
