import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/api/supabase";
import type { LoyaltyRewardRow, StaffScan, StaffScanError, StaffWashResult, VipCardState, Wallet, WalletScan } from "@/shared/database";

const WALLET_KEY = ["wallet"] as const;

async function rpc<T>(fn: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await db().rpc(fn, params);
  if (error) throw error;
  return data as T;
}

/** Cliente: saldo, VIP, logros, canjes activos, código de referido. */
export function useWallet() {
  return useQuery({ queryKey: WALLET_KEY, queryFn: () => rpc<Wallet>("my_wallet") });
}

/** Cliente: su tarjeta VIP de casillas. Se refresca al volver a la app (una casilla se marca al terminar su carro). */
export function useVipCard() {
  return useQuery({ queryKey: ["vip-card"], queryFn: () => rpc<VipCardState>("my_vip_card"), staleTime: 30_000 });
}

export type WalletPlatform = "google" | "apple";

/** Qué wallets del teléfono están configuradas en el servidor (sin credenciales, ninguna). */
export function useWalletPassStatus() {
  return useQuery({
    queryKey: ["wallet-pass-status"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await db().functions.invoke<Record<WalletPlatform, boolean>>("wallet-pass/status", { method: "GET" });
      if (error) throw error;
      return data ?? { google: false, apple: false };
    },
  });
}

/** Pide al servidor el enlace para guardar la Tarjeta VIP en Google Wallet o Apple Wallet. */
export function useAddToPhoneWallet() {
  return useMutation({
    mutationFn: async (platform: WalletPlatform) => {
      const { data, error } = await db().functions.invoke<{ url: string }>("wallet-pass/issue", { body: { platform } });
      if (error) throw error;
      if (!data?.url) throw new Error("wallet_pass_failed");
      return data.url;
    },
  });
}

/** QR de la wallet: token de 90 s que se renueva cada minuto mientras la pantalla está abierta. */
export function useWalletToken(enabled: boolean) {
  return useQuery({
    queryKey: ["wallet-token"],
    enabled,
    queryFn: () => rpc<{ token: string; expires_at: string }>("issue_wallet_token"),
    refetchInterval: 60_000,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useRewards(enabled: boolean) {
  return useQuery({
    queryKey: ["rewards"],
    enabled,
    queryFn: async () => {
      const { data, error } = await db().from("loyalty_rewards").select("*").eq("active", true).order("sort_order");
      if (error) throw error;
      return data as LoyaltyRewardRow[];
    },
  });
}

function useWalletMutation<V, R = void>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: WALLET_KEY }) });
}

export const useRedeem = () =>
  useWalletMutation((rewardId: string) => rpc<{ id: string; code: string }>("redeem_reward", { p_reward_id: rewardId }));
export const useCancelRedemption = () => useWalletMutation((id: string) => rpc<void>("cancel_redemption", { p_redemption_id: id }));
export const useApplyReferral = () => useWalletMutation((code: string) => rpc<void>("apply_referral_code", { p_code: code }));

/** Reseña INTERNA de un servicio completado (no se publica). */
export function useMyReview(bookingId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["review", bookingId],
    enabled,
    queryFn: async () => {
      const { data, error } = await db().from("reviews").select("rating").eq("booking_id", bookingId).maybeSingle();
      if (error) throw error;
      return data as { rating: number } | null;
    },
  });
}

export function useSubmitReview(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { rating: number; comment: string }) =>
      rpc<void>("submit_review", { p_booking_id: bookingId, p_rating: v.rating, p_comment: v.comment || null }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["review", bookingId] });
      qc.invalidateQueries({ queryKey: WALLET_KEY });
    },
  });
}

/** Personal: qué cliente es el del QR escaneado. */
export function useResolveWallet() {
  return useMutation({ mutationFn: (token: string) => rpc<WalletScan>("resolve_wallet_token", { p_token: token }) });
}

/**
 * Personal: rutas del escáner en la Edge Function wallet-pass (van con la sesión del colaborador).
 * Los errores de la BD llegan como { error: "<código>" } y se lanzan con ese código como mensaje.
 */
async function staffCall<T>(path: "scan" | "complete" | "walk-in", body: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().functions.invoke<T>(`wallet-pass/${path}`, { body });
  if (error) {
    const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
    const code = await ctx?.json?.().then((b) => b?.error).catch(() => undefined);
    throw new Error(code ?? error.message);
  }
  if (!data) throw new Error("server_error");
  return data;
}

/** Escanear cualquier QR de la Tarjeta VIP (app, Apple Wallet o Google Wallet). */
export function useStaffScan() {
  return useMutation({ mutationFn: (code: string) => staffCall<StaffScan | StaffScanError>("scan", { code }) });
}

/** Lavado completado de una reserva de hoy: marca la casilla y actualiza el pase del teléfono al instante. */
export function useStaffComplete() {
  return useMutation({
    mutationFn: (v: { scanId: string; bookingId: string }) =>
      staffCall<StaffWashResult>("complete", { scan_id: v.scanId, booking_id: v.bookingId }),
  });
}

/** Lavado sin cita: reserva instantánea ya completada, con su casilla. */
export function useStaffWalkIn() {
  return useMutation({
    mutationFn: (v: { scanId: string; serviceId: string; vehicleId: string | null; vehicleKind: string | null }) =>
      staffCall<StaffWashResult>("walk-in", {
        scan_id: v.scanId,
        service_id: v.serviceId,
        vehicle_id: v.vehicleId,
        vehicle_kind: v.vehicleKind,
      }),
  });
}

/** Personal: marca un canje como entregado. */
export function useMarkRedemptionUsed() {
  return useMutation({ mutationFn: (id: string) => rpc<void>("use_redemption", { p_redemption_id: id }) });
}
