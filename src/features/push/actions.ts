/**
 * Qué hacer cuando la persona toca una notificación o uno de sus botones.
 * Lógica pura (sin expo-notifications) para poder probarla.
 */
export const REMINDER_CATEGORY = "booking_reminder";
export const REMINDER_REPLIES = ["attending", "late", "cancel"] as const;
export type ReminderReply = (typeof REMINDER_REPLIES)[number];

export type ResponseIntent =
  | { type: "reply"; bookingId: string; reply: ReminderReply }
  | { type: "open"; url: string }
  | null;

export function intentFromResponse(actionIdentifier: string, data: Record<string, unknown> | undefined): ResponseIntent {
  const bookingId = typeof data?.booking_id === "string" ? data.booking_id : null;
  if (bookingId && (REMINDER_REPLIES as readonly string[]).includes(actionIdentifier)) {
    return { type: "reply", bookingId, reply: actionIdentifier as ReminderReply };
  }
  // Solo rutas internas de la app (nunca una URL externa que venga en la notificación).
  if (typeof data?.url === "string" && /^\/[A-Za-z0-9/_-]*$/.test(data.url)) return { type: "open", url: data.url };
  if (typeof data?.ticket_id === "string") return { type: "open", url: "/support" };
  return null;
}
