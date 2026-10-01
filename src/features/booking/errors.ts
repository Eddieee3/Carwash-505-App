import type { Copy } from "@/i18n";

/** Códigos que devuelven las funciones de reservas (migración 8) en `error.message`. */
export const BOOKING_ERROR_CODES = [
  "slot_taken",
  "closed",
  "too_soon",
  "too_far",
  "outside_hours",
  "too_many_active",
  "vehicle_invalid",
  "service_not_bookable",
  "not_customer",
  "cannot_cancel",
  "invalid_transition",
  "bay_invalid",
  "forbidden",
  "not_found",
  // Fidelización (migración 10)
  "invalid_code",
  "already_referred",
  "not_eligible",
  "invalid_rating",
  "cannot_review",
  "already_reviewed",
  "loyalty_disabled",
  "reward_unavailable",
  "insufficient_points",
  "invalid_redemption",
  "invalid_token",
  // Comercio (migración 11)
  "payments_disabled",
  "plan_unavailable",
  "order_pending",
  "invalid_amount",
  "invalid_order",
  "invalid_gift_card",
  "insufficient_balance",
  "spin_unavailable",
  "cannot_spin",
  "already_spun",
  // Tarifas, extras y marketing (migraciones 12 y 13)
  "price_changed",
  "addon_invalid",
  "invalid_birthday",
  "birthday_locked",
  // Operación (migración 14)
  "customer_restricted",
  "insufficient_stock",
  "invalid_quantity",
  "invalid_item",
  "invalid_cost",
  "note_required",
  "invalid_task",
  "invalid_range",
  // Escáner de la Tarjeta VIP (migración 22)
  "scan_invalid",
  "scan_used",
  "scan_expired",
  "booking_invalid",
  "booking_not_today",
  "no_bay_free",
  // Vehículos y fotos (migración 25)
  "vehicles_plate_format",
  "vehicles_plate_unique",
  "year_invalid",
  "vehicle_has_active_bookings",
  "permission_denied",
  "photo_type",
  "photo_too_large",
  "photo_too_small",
  // Operación y cobros (migración 26)
  "reason_required",
  "staff_invalid",
  "invalid_closure",
  "price_pending",
  "overpayment",
  "invalid_method",
] as const;
export type BookingErrorCode = (typeof BOOKING_ERROR_CODES)[number];

export function bookingErrorCode(error: unknown): BookingErrorCode | "network" | "generic" {
  const message = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : "";
  const code = BOOKING_ERROR_CODES.find((c) => message.includes(c));
  if (code) return code;
  if (/network|fetch|timeout/i.test(message)) return "network";
  return "generic";
}

export function bookingErrorMessage(error: unknown, copy: Copy): string {
  return copy.errors[bookingErrorCode(error)];
}
