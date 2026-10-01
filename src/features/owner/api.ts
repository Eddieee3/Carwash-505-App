import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/api/supabase";
import type { BayClosureRow, BayKind, OwnerDashboard } from "@/shared/database";
import type { OpeningHours } from "@/shared/site";

/** Dashboard en vivo del propietario: resumen del día, VIP presentes, riesgo de no-show, insumos y tareas. */
export function useOwnerDashboard() {
  return useQuery({
    queryKey: ["owner-dashboard"],
    queryFn: async () => {
      const { data, error } = await db().rpc("owner_dashboard", {});
      if (error) throw error;
      return data as OwnerDashboard;
    },
    refetchInterval: 60_000,
  });
}

export function useOpeningHours() {
  return useQuery({
    queryKey: ["opening-hours"],
    queryFn: async () => {
      const { data, error } = await db().from("business_settings").select("opening_hours").eq("id", 1).single();
      if (error) throw error;
      return (data as { opening_hours: OpeningHours }).opening_hours;
    },
    staleTime: 30 * 60_000,
  });
}

/** Cierres vigentes o futuros (los reabiertos quedan en el historial y ya no cuentan). */
export function useClosures() {
  return useQuery({
    queryKey: ["closures"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("bay_closures")
        .select("*")
        .gt("ends_at", new Date().toISOString())
        .is("reopened_at", null)
        .order("starts_at");
      if (error) throw error;
      return data as BayClosureRow[];
    },
  });
}

/**
 * B05: cierre por clima o mantenimiento de un tipo de bahía (solo el dueño). No cancela ni borra reservas: el servidor
 * devuelve cuántas quedan dentro del cierre para avisarles.
 */
export function useCloseBays() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { kind: BayKind; until: Date; reason: BayClosureRow["reason"]; note?: string }) => {
      const { data, error } = await db().rpc("close_bays", {
        p_kind: v.kind,
        p_starts_at: new Date().toISOString(),
        p_ends_at: v.until.toISOString(),
        p_reason: v.reason,
        p_note: v.note ?? null,
      });
      if (error) throw error;
      return data as { closure_id: string; affected_bookings: number };
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["closures"] });
      qc.invalidateQueries({ queryKey: ["owner-dashboard"] });
    },
  });
}

/** Reabrir: queda registrado quién y cuándo (no se borra el cierre). */
export function useReopen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().rpc("reopen_closure", { p_closure_id: id });
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["closures"] });
      qc.invalidateQueries({ queryKey: ["owner-dashboard"] });
    },
  });
}
