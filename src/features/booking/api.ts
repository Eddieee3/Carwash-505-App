import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/api/supabase";
import { localDate, zonedToUtc } from "@/lib/time";
import type { BookingRow, BookingStatus, ServiceRow, VehicleKind, VehicleRow } from "@/shared/database";

export type BookableService = Pick<
  ServiceRow,
  "id" | "slug" | "name_es" | "name_en" | "price_car" | "price_suv" | "currency" | "requires_evaluation" | "bay_kind"
>;
export type Slot = { slot_start: string; slot_end: string; free_bays: number };
export type MyBooking = Pick<
  BookingRow,
  "id" | "reference_code" | "status" | "starts_at" | "slot" | "price_snapshot" | "service_id" | "vehicle_id" | "attendance" | "eta_at"
> & {
  vehicle: Pick<VehicleRow, "kind" | "make" | "model" | "nickname" | "plate"> | null;
};

export const ACTIVE_STATUSES: BookingStatus[] = ["confirmed", "checked_in", "in_progress"];
export const PAST_STATUSES: BookingStatus[] = ["completed", "cancelled", "no_show"];
const BOOKING_FIELDS =
  "id, reference_code, status, starts_at, slot, price_snapshot, service_id, vehicle_id, attendance, eta_at, vehicle:vehicles(kind, make, model, nickname, plate)";

export function useBookableServices() {
  return useQuery({
    queryKey: ["bookable-services"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("services")
        .select("id, slug, name_es, name_en, price_car, price_suv, currency, requires_evaluation, bay_kind")
        .eq("status", "published")
        .eq("bookable", true)
        .order("sort_order");
      if (error) throw error;
      return data as BookableService[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useBookingHorizon() {
  return useQuery({
    queryKey: ["booking-settings"],
    queryFn: async () => {
      const { data, error } = await db().from("business_settings").select("booking_horizon_days").eq("id", 1).single();
      if (error) throw error;
      return (data as { booking_horizon_days: number }).booking_horizon_days;
    },
    staleTime: 30 * 60_000,
  });
}

/** Horas del día con bahías libres. Se refresca sola: otras personas reservan al mismo tiempo. */
export function useAvailableSlots(day: string, serviceId: string | null, kind: VehicleKind | null) {
  return useQuery({
    queryKey: ["slots", day, serviceId, kind],
    enabled: serviceId !== null && kind !== null,
    queryFn: async () => {
      const { data, error } = await db().rpc("available_slots", { p_day: day, p_service_id: serviceId, p_vehicle_kind: kind });
      if (error) throw error;
      return data as Slot[];
    },
    refetchInterval: 20_000,
    staleTime: 10_000,
  });
}

export function useBookSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      serviceId: string;
      vehicleId: string;
      startsAt: string;
      idempotencyKey: string;
      addonIds: string[];
      /** Total que vio el cliente: si el servidor calcula otro, responde price_changed. */
      expectedTotal: number | null;
    }) => {
      const { data, error } = await db().rpc("book_slot", {
        p_service_id: input.serviceId,
        p_vehicle_id: input.vehicleId,
        p_starts_at: input.startsAt,
        p_idempotency_key: input.idempotencyKey,
        p_addon_ids: input.addonIds,
        p_expected_total: input.expectedTotal,
      });
      if (error) throw error;
      return data as BookingRow;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["slots"] });
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      qc.invalidateQueries({ queryKey: ["promotions"] }); // el cupón se consumió
    },
  });
}

/** Citas activas desde hoy (hora de Managua), la más próxima primero. */
export function useMyBookings() {
  return useQuery({
    queryKey: ["my-bookings"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("bookings")
        .select(BOOKING_FIELDS)
        .in("status", ACTIVE_STATUSES)
        .gte("starts_at", zonedToUtc(localDate(), "00:00").toISOString())
        .order("starts_at");
      if (error) throw error;
      return data as unknown as MyBooking[];
    },
    refetchInterval: 60_000,
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ["my-bookings", id],
    queryFn: async () => {
      const { data, error } = await db().from("bookings").select(BOOKING_FIELDS).eq("id", id).maybeSingle();
      if (error) throw error;
      return data as unknown as MyBooking | null;
    },
  });
}

/** Servicios anteriores (completados, cancelados, no asistió), el más reciente primero. */
export function useBookingHistory() {
  return useQuery({
    queryKey: ["my-bookings", "history"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("bookings")
        .select(BOOKING_FIELDS)
        .in("status", PAST_STATUSES)
        .order("starts_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as unknown as MyBooking[];
    },
  });
}

function useBookingRpc<V>(fn: string, toParams: (v: V) => Record<string, unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: V) => {
      const { error } = await db().rpc(fn, toParams(vars));
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["my-bookings"] }),
  });
}

/** "Asistiré" / "Llegaré tarde" (también desde los botones de la notificación). */
export function useReplyAttendance() {
  return useBookingRpc("reply_attendance", (v: { id: string; reply: "attending" | "late" }) => ({ p_booking_id: v.id, p_reply: v.reply }));
}

/** "Llego en X min". */
export function useSetEta() {
  return useBookingRpc("set_eta", (v: { id: string; minutes: number }) => ({ p_booking_id: v.id, p_minutes: v.minutes }));
}

/** Hora estimada de entrega (solo con duraciones medidas; si no hay datos, null). */
export function useEstimate(bookingId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["estimate", bookingId],
    enabled,
    queryFn: async () => {
      const { data, error } = await db().rpc("booking_estimate", { p_booking_id: bookingId });
      if (error) throw error;
      return (data as string | null) ?? null;
    },
    refetchInterval: 60_000,
  });
}

/** Enlaces oficiales para llegar (null = no confirmado: el botón no se muestra). */
export function useDirections() {
  return useQuery({
    queryKey: ["directions"],
    queryFn: async () => {
      const { data, error } = await db().from("business_settings").select("waze_url, google_maps_url").eq("id", 1).single();
      if (error) throw error;
      return data as { waze_url: string | null; google_maps_url: string | null };
    },
    staleTime: 30 * 60_000,
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().rpc("cancel_booking", { p_booking_id: id });
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}
