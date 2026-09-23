import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/api/supabase";
import type { BayClosureRow, OwnerDashboard } from "@/shared/database";
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

/** Cierres vigentes o futuros. */
export function useClosures() {
  return useQuery({
    queryKey: ["closures"],
    queryFn: async () => {
      const { data, error } = await db()
        .from("bay_closures")
        .select("*")
        .gt("ends_at", new Date().toISOString())
        .order("starts_at");
      if (error) throw error;
      return data as BayClosureRow[];
    },
  });
}

export function useCloseWash() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (until: Date) => {
      const { error } = await db()
        .from("bay_closures")
        .insert({ bay_kind: "wash", starts_at: new Date().toISOString(), ends_at: until.toISOString(), reason: "weather" });
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["closures"] });
      qc.invalidateQueries({ queryKey: ["owner-dashboard"] });
    },
  });
}

export function useReopen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().from("bay_closures").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["closures"] });
      qc.invalidateQueries({ queryKey: ["owner-dashboard"] });
    },
  });
}
