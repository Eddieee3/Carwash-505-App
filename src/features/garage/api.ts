import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { currentUserId, db } from "@/api/supabase";
import type { VehicleRow } from "@/shared/database";
import type { VehicleInput } from "./vehicle";

export const VEHICLES_KEY = ["vehicles"] as const;

/** Vehículos activos del cliente (RLS: solo los propios). El principal primero. */
export function useVehicles() {
  return useQuery({
    queryKey: VEHICLES_KEY,
    queryFn: async () => {
      const { data, error } = await db()
        .from("vehicles")
        .select("*")
        .is("archived_at", null)
        .order("is_default", { ascending: false })
        .order("created_at");
      if (error) throw error;
      return data as VehicleRow[];
    },
  });
}

// La BD admite un solo vehículo principal: primero se quita la marca a los demás.
async function clearDefault(exceptId?: string) {
  let query = db().from("vehicles").update({ is_default: false }).eq("is_default", true);
  if (exceptId) query = query.neq("id", exceptId);
  const { error } = await query;
  if (error) throw error;
}

export function useSaveVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input, isFirst }: { id?: string; input: VehicleInput; isFirst: boolean }) => {
      const isDefault = input.is_default || isFirst;
      if (isDefault) await clearDefault(id);
      const row = { ...input, is_default: isDefault };
      const { error } = id
        ? await db().from("vehicles").update(row).eq("id", id)
        : await db().from("vehicles").insert({ ...row, customer_id: await currentUserId() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: VEHICLES_KEY }),
  });
}

/** Se archiva (no se borra) para no romper el historial de reservas. */
export function useArchiveVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db()
        .from("vehicles")
        .update({ archived_at: new Date().toISOString(), is_default: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: VEHICLES_KEY }),
  });
}
