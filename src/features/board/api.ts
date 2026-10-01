import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { db, supabase } from "@/api/supabase";
import type { AssignableStaff, BayRow, PaymentMethod, PaymentSummary } from "@/shared/database";
import { ACTION_TO_STATUS, type BoardAction, type BoardRow } from "./model";

export const BOARD_KEY = ["board"] as const;

export function useStaffBoard(day: string) {
  return useQuery({
    queryKey: [...BOARD_KEY, day],
    queryFn: async () => {
      const { data, error } = await db().rpc("staff_board", { p_day: day });
      if (error) throw error;
      return data as BoardRow[];
    },
    refetchInterval: 60_000, // respaldo si se corta el tiempo real
  });
}

/**
 * Tiempo real: cualquier cambio en reservas o cierres refresca el tablero y el resumen.
 * RLS decide qué eventos llegan (el personal ve todas las reservas; un cliente, solo las suyas).
 */
export function useBookingsRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const refresh = () => {
      qc.invalidateQueries({ queryKey: BOARD_KEY });
      qc.invalidateQueries({ queryKey: ["owner-dashboard"] });
      qc.invalidateQueries({ queryKey: ["closures"] });
    };
    // Nombre único por montaje: supabase-js reutiliza un canal con el mismo nombre si el anterior aún no terminó de
    // cerrarse (volver a la pestaña, varias pantallas a la vez) y agregarle eventos tras subscribe() falla.
    const channel = client
      .channel(`bookings-live-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "bay_closures" }, refresh)
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [qc]);
}

export function useBays() {
  return useQuery({
    queryKey: ["bays"],
    queryFn: async () => {
      const { data, error } = await db().from("bays").select("*").eq("active", true).order("sort_order");
      if (error) throw error;
      return data as BayRow[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useBoardAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
      bayId,
      staffId,
      reason,
    }: {
      id: string;
      action: BoardAction | "moveBay" | "assignTo";
      bayId?: string;
      /** O01: responsable elegido por el dueño o el admin del lobby. */
      staffId?: string;
      /** O04: motivo de la cancelación (obligatorio para el personal). */
      reason?: string;
    }) => {
      const call =
        action === "cancel"
          ? db().rpc("cancel_booking", { p_booking_id: id, p_reason: reason ?? null })
          : action === "assignMe"
            ? db().rpc("assign_booking", { p_booking_id: id, p_assign_me: true })
            : action === "assignTo"
              ? db().rpc("assign_booking", { p_booking_id: id, p_staff_id: staffId })
              : action === "moveBay"
                ? db().rpc("assign_booking", { p_booking_id: id, p_bay_id: bayId })
                : db().rpc("advance_booking", { p_booking_id: id, p_to_status: ACTION_TO_STATUS[action] });
      const { error } = await call;
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: BOARD_KEY });
      qc.invalidateQueries({ queryKey: ["owner-dashboard"] });
    },
  });
}

/** Personal activo al que se puede asignar una reserva o una tarea. */
export function useAssignableStaff(enabled = true) {
  return useQuery({
    queryKey: ["assignable-staff"],
    enabled,
    queryFn: async () => {
      const { data, error } = await db().rpc("assignable_staff");
      if (error) throw error;
      return data as AssignableStaff[];
    },
    staleTime: 5 * 60_000,
  });
}

/** E01: estado de cobro de una reserva (recepción). */
export function useBookingPayments(bookingId: string | null) {
  return useQuery({
    queryKey: ["booking-payments", bookingId],
    enabled: !!bookingId,
    queryFn: async () => {
      const { data, error } = await db().rpc("booking_payments_for", { p_booking_id: bookingId });
      if (error) throw error;
      return data as PaymentSummary;
    },
  });
}

function usePaymentMutation<V>(fn: (v: V) => PromiseLike<{ data: unknown; error: unknown }>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: V) => {
      const { data, error } = await fn(v);
      if (error) throw error;
      return data as PaymentSummary;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["booking-payments"] });
      qc.invalidateQueries({ queryKey: ["owner-dashboard"] });
    },
  });
}

/** Registra un cobro. requestId se genera una vez por intento: un doble toque o un reintento no cobra dos veces. */
export function useRecordPayment() {
  return usePaymentMutation((v: { bookingId: string; amount: number; method: PaymentMethod; requestId: string; note?: string }) =>
    db().rpc("record_booking_payment", {
      p_booking_id: v.bookingId,
      p_amount: v.amount,
      p_method: v.method,
      p_request_id: v.requestId,
      p_note: v.note ?? null,
    }),
  );
}

/** Fija el precio de lo que estaba por cotizar (recepción) o corrige un total (solo el dueño). */
export function useSetFinalPrice() {
  return usePaymentMutation((v: { bookingId: string; amount: number; note?: string }) =>
    db().rpc("set_booking_final_price", { p_booking_id: v.bookingId, p_amount: v.amount, p_note: v.note ?? null }),
  );
}
