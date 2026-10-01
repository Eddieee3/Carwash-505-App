import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/api/supabase";
import type { InventoryStatusItem, InventoryUnit, MaintenanceTask, ReportLinks } from "@/shared/database";

async function rpc<T>(fn: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await db().rpc(fn, params);
  if (error) throw error;
  return data as T;
}

/** Insumos con existencia y alerta de mínimo (sin costos: los ve solo el propietario en los reportes). */
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

/** I03: requestId identifica el intento; un reintento no descuenta dos veces. */
export const useRecordUsage = () =>
  useOpsMutation(
    (v: { item: string; qty: number; requestId: string; bookingId?: string | null; taskId?: string | null }) =>
      rpc("record_usage", { p_item: v.item, p_qty: v.qty, p_request_id: v.requestId, p_booking_id: v.bookingId ?? null, p_task_id: v.taskId ?? null }),
    [["inventory"]],
  );

/** I01: crear, editar o archivar insumos (solo el propietario; lo decide la política de la tabla). */
export const useSaveSupply = () =>
  useOpsMutation(async (v: { id?: string; name: string; unit: InventoryUnit; minStock: number | null }) => {
    const row = { name: v.name.trim(), unit: v.unit, min_stock: v.minStock };
    const { error } = v.id ? await db().from("inventory_items").update(row).eq("id", v.id) : await db().from("inventory_items").insert(row);
    if (error) throw error;
  }, [["inventory"]]);
export const useArchiveSupply = () =>
  useOpsMutation(async (id: string) => {
    const { error } = await db().from("inventory_items").update({ active: false }).eq("id", id);
    if (error) throw error;
  }, [["inventory"]]);
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

/** O02: crear una tarea (dueño o lobby). requestId evita duplicados por doble toque o reintento. */
export const useCreateTask = () =>
  useOpsMutation(
    (v: { title: string; dueAt: string; assigneeId: string | null; notes?: string; bookingId?: string | null; requestId: string }) =>
      rpc<string>("create_task", {
        p_title: v.title,
        p_due_at: v.dueAt,
        p_assignee_id: v.assigneeId,
        p_notes: v.notes ?? null,
        p_booking_id: v.bookingId ?? null,
        p_request_id: v.requestId,
      }),
    [["tasks"]],
  );
export const useReassignTask = () =>
  useOpsMutation((v: { task: string; assigneeId: string | null }) => rpc("reassign_task", { p_task: v.task, p_assignee_id: v.assigneeId }), [["tasks"]]);

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
