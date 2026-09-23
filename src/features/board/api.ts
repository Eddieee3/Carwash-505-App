import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { db, supabase } from "@/api/supabase";
import type { BayRow } from "@/shared/database";
import type { BoardAction, BoardRow } from "./model";

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
    const channel = client
      .channel("bookings-live")
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

const TO_STATUS: Partial<Record<BoardAction, string>> = {
  checkIn: "checked_in",
  start: "in_progress",
  finish: "completed",
  noShow: "no_show",
};

export function useBoardAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, bayId }: { id: string; action: BoardAction | "moveBay"; bayId?: string }) => {
      const call =
        action === "cancel"
          ? db().rpc("cancel_booking", { p_booking_id: id })
          : action === "assignMe"
            ? db().rpc("assign_booking", { p_booking_id: id, p_assign_me: true })
            : action === "moveBay"
              ? db().rpc("assign_booking", { p_booking_id: id, p_bay_id: bayId })
              : db().rpc("advance_booking", { p_booking_id: id, p_to_status: TO_STATUS[action] });
      const { error } = await call;
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: BOARD_KEY });
      qc.invalidateQueries({ queryKey: ["owner-dashboard"] });
    },
  });
}
