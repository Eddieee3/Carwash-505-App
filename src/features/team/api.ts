import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/api/supabase";
import type { StaffMember } from "@/shared/database";

const TEAM_KEY = ["team"] as const;
export type StaffRole = StaffMember["role"];

/** Dueño: su personal (admin del lobby y colaboradores). La BD solo se lo da al dueño (owner_staff). */
export function useTeam() {
  return useQuery({
    queryKey: TEAM_KEY,
    queryFn: async () => {
      const { data, error } = await db().rpc("owner_staff");
      if (error) throw error;
      return (data ?? []) as StaffMember[];
    },
  });
}

/** Llamada a la Edge Function staff-users; sus errores llegan como { error: "<código>" }. */
async function staffUsers<T>(path: "create" | "password", body: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().functions.invoke<T>(`staff-users/${path}`, { body });
  if (error) {
    const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
    const code = await ctx?.json?.().then((b) => b?.error).catch(() => undefined);
    throw new Error(code ?? "generic");
  }
  if (!data) throw new Error("generic");
  return data;
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { full_name: string; username: string; password: string; role: StaffRole }) =>
      staffUsers<{ id: string; username: string }>("create", v),
    onSettled: () => qc.invalidateQueries({ queryKey: TEAM_KEY }),
  });
}

export function useSetStaffPassword() {
  return useMutation({ mutationFn: (v: { id: string; password: string }) => staffUsers<{ ok: true }>("password", v) });
}

/** Cambiar rol, nombre o activar/desactivar (owner_update_staff). Desactivar quita el acceso al instante. */
export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; role?: StaffRole; status?: "active" | "disabled" }) => {
      const { error } = await db().rpc("owner_update_staff", { p_id: v.id, p_role: v.role ?? null, p_status: v.status ?? null });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: TEAM_KEY }),
  });
}
