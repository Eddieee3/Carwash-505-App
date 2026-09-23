import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/api/supabase";
import type { InventoryStatusItem, MaintenanceTask, ReportLinks } from "@/shared/database";

async function rpc<T>(fn: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await db().rpc(fn, params);
  if (error) throw error;
  return data as T;
}

/** Insumos con existencia y alerta de mínimo (sin costos: los ve solo el propietario en el panel/reportes). */
export function useInventory() {
  return useQuery({ queryKey: ["inventory"], queryFn: () => rpc<InventoryStatusItem[]>("inventory_status") });
}

function useOpsMutation<V>(fn: (v: V) => Promise<unknown>, keys: string[][]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      for (const key of [...keys, ["owner-dashboard"]]) qc.invalidateQueries({ queryKey: key });
    },
  });
}

export const useRecordUsage = () =>
  useOpsMutation((v: { item: string; qty: number }) => rpc("record_usage", { p_item: v.item, p_qty: v.qty }), [["inventory"]]);
export const useRecordPurchase = () =>
  useOpsMutation(
    (v: { item: string; qty: number; unitCost: number | null; currency: string | null }) =>
      rpc("record_purchase", { p_item: v.item, p_qty: v.qty, p_unit_cost: v.unitCost, p_currency: v.currency }),
    [["inventory"]],
  );
export const useAdjustStock = () =>
  useOpsMutation(
    (v: { item: string; counted: number; note: string }) => rpc("adjust_stock", { p_item: v.item, p_counted: v.counted, p_note: v.note }),
    [["inventory"]],
  );

export function useTasks() {
  return useQuery({ queryKey: ["tasks"], queryFn: () => rpc<MaintenanceTask[]>("my_tasks") });
}
export const useCompleteTask = () => useOpsMutation((id: string) => rpc("complete_task", { p_task: id }), [["tasks"]]);

/** Reporte del propietario: lo arma la Edge Function owner-report y devuelve enlaces firmados de 10 minutos. */
export function useGenerateReport() {
  return useMutation({
    mutationFn: async (v: { from: string; to: string; locale: "es" | "en" }) => {
      const { data, error } = await db().functions.invoke<ReportLinks>("owner-report", { body: v });
      if (error) throw error;
      if (!data) throw new Error("report_failed");
      return data;
    },
  });
}
