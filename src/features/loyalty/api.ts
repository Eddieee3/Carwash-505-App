import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/api/supabase";
import type { LoyaltyRewardRow, Wallet, WalletScan } from "@/shared/database";

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

/** Personal: marca un canje como entregado. */
export function useMarkRedemptionUsed() {
  return useMutation({ mutationFn: (id: string) => rpc<void>("use_redemption", { p_redemption_id: id }) });
}
