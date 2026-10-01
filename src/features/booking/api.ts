import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/api/supabase";
import { localDate, zonedToUtc } from "@/lib/time";
import type { AddonService, BookingRow, BookingStatus, ServiceRow, VehicleKind, VehicleRow } from "@/shared/database";

export type BookableService = Pick<
  ServiceRow,
  | "id"
  | "slug"
  | "name_es"
  | "name_en"
  | "price_car"
  | "price_suv"
  | "price_large"
  | "currency"
  | "requires_evaluation"
  | "bay_kind"
  | "duration_minutes_car"
  | "duration_minutes_suv"
  | "duration_minutes_large"
  | "description_es"
  | "description_en"
  | "includes_es"
  | "includes_en"
  | "excludes_es"
  | "excludes_en"
  | "rain_warranty_hours"
>;
export type Slot = { slot_start: string; slot_end: string; free_bays: number };
export type DayAvailability = { day: string; total: number; free: number };
export type MyBooking = Pick<
  BookingRow,
  "id" | "reference_code" | "status" | "starts_at" | "slot" | "price_snapshot" | "service_id" | "vehicle_id" | "attendance" | "eta_at"
> & {
  vehicle: Pick<VehicleRow, "kind" | "make" | "model" | "nickname" | "plate"> | null;
};

export const ACTIVE_STATUSES: BookingStatus[] = ["confirmed", "checked_in", "in_progress", "quality_check", "ready"];
export const PAST_STATUSES: BookingStatus[] = ["completed", "cancelled", "no_show"];
const BOOKING_FIELDS =
  "id, reference_code, status, starts_at, slot, price_snapshot, service_id, vehicle_id, attendance, eta_at, vehicle:vehicles(kind, make, model, nickname, plate)";

export function useBookableServices() {
  return useQuery({
    queryKey: ["bookable-services"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("services")
        .select(
          "id, slug, name_es, name_en, price_car, price_suv, price_large, currency, requires_evaluation, bay_kind, duration_minutes_car, duration_minutes_suv, duration_minutes_large, description_es, description_en, includes_es, includes_en, excludes_es, excludes_en, rain_warranty_hours",
        )
        .eq("status", "published")
        .eq("bookable", true)
        .eq("booking_role", "main")
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

/** Adicionales que se pueden sumar al servicio principal, con precio y duración para el vehículo elegido. */
export function useAddonServices(serviceId: string | null, vehicleId: string | null) {
  return useQuery({
    queryKey: ["addon-services", serviceId, vehicleId],
    enabled: !!serviceId && !!vehicleId,
    queryFn: async () => {
      const { data, error } = await db().rpc("booking_addon_services", { p_service_id: serviceId, p_vehicle_id: vehicleId });
      if (error) throw error;
      return data as AddonService[];
    },
    staleTime: 5 * 60_000,
  });
}

const sortedKey = (ids: string[]) => [...ids].sort().join(",");

/** Horas del día con bahías libres para la duración total (principal + adicionales). Se refresca sola. */
export function useAvailableSlots(day: string, serviceId: string | null, kind: VehicleKind | null, addonServiceIds: string[] = []) {
  return useQuery({
    queryKey: ["slots", day, serviceId, kind, sortedKey(addonServiceIds)],
    enabled: serviceId !== null && kind !== null,
    queryFn: async () => {
      const { data, error } = await db().rpc("available_slots", {
        p_day: day,
        p_service_id: serviceId,
        p_vehicle_kind: kind,
        p_addon_service_ids: addonServiceIds,
      });
      if (error) throw error;
      return data as Slot[];
    },
    refetchInterval: 20_000,
    staleTime: 10_000,
  });
}

/** Horarios totales y libres de cada día reservable, para colorear el calendario. Se refresca solo. */
export function useAvailableDays(serviceId: string | null, kind: VehicleKind | null, addonServiceIds: string[] = []) {
  return useQuery({
    queryKey: ["available-days", serviceId, kind, sortedKey(addonServiceIds)],
    enabled: serviceId !== null && kind !== null,
    queryFn: async () => {
      const { data, error } = await db().rpc("available_days", {
        p_service_id: serviceId,
        p_vehicle_kind: kind,
        p_addon_service_ids: addonServiceIds,
      });
      if (error) throw error;
      return data as DayAvailability[];
    },
    refetchInterval: 60_000,
    staleTime: 20_000,
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
      /** Servicios adicionales (motor, chasis…) que se suman al principal. */
      addonServiceIds: string[];
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
        p_addon_service_ids: input.addonServiceIds,
      });
      if (error) throw error;
      return data as BookingRow;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["slots"] });
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      qc.invalidateQueries({ queryKey: ["promotions"] }); // el cupón se consumió
      qc.invalidateQueries({ queryKey: ["vip-card"] }); // el lavado gratis quedó apartado
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
    // C02: mientras el servicio está en curso, el avance se actualiza solo (RLS: solo reservas propias).
    refetchInterval: (q) => (q.state.data && ACTIVE_STATUSES.includes(q.state.data.status) ? 20_000 : false),
  });
}

/** Servicios anteriores (completados, cancelados, no asistió), el más reciente primero; opcionalmente de un vehículo. */
export function useBookingHistory(vehicleId?: string | null) {
  return useQuery({
    queryKey: ["my-bookings", "history", vehicleId ?? "all"],
    queryFn: async () => {
      let query = db().from("bookings").select(BOOKING_FIELDS).in("status", PAST_STATUSES);
      if (vehicleId) query = query.eq("vehicle_id", vehicleId);
      const { data, error } = await query.order("starts_at", { ascending: false }).limit(30);
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
