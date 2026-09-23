import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/api/supabase";
import type { Commerce, MembershipCode, SpinResult } from "@/shared/database";

const COMMERCE_KEY = ["commerce"] as const;

async function rpc<T>(fn: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await db().rpc(fn, params);
  if (error) throw error;
  return data as T;
}

/** Cliente: planes, membresía vigente, gift cards, órdenes por pagar y si la ruleta está activa. */
export function useCommerce() {
  return useQuery({ queryKey: COMMERCE_KEY, queryFn: () => rpc<Commerce>("my_commerce") });
}

function useCommerceMutation<V, R = void>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: COMMERCE_KEY }) });
}

/** Solicitudes con pago en el local: devuelven la orden con su código `P…`. */
export const useRequestMembership = () =>
  useCommerceMutation((plan: MembershipCode) => rpc<{ id: string; code: string }>("request_membership", { p_plan: plan }));
export const useRequestGiftCard = () =>
  useCommerceMutation((amount: number) => rpc<{ id: string; code: string }>("request_gift_card", { p_amount: amount }));
export const useCancelOrder = () => useCommerceMutation((id: string) => rpc<void>("cancel_order", { p_order_id: id }));
export const useTransferGiftCard = () =>
  useCommerceMutation((v: { id: string; code: string }) => rpc<void>("transfer_gift_card", { p_gift_card_id: v.id, p_recipient_code: v.code }));

/** Ruleta: ¿ya giró por esta reserva? (RLS: solo los giros propios). */
export function useMySpin(bookingId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["spin", bookingId],
    enabled,
    queryFn: async () => {
      const { data, error } = await db().from("spins").select("label_es, label_en, points").eq("booking_id", bookingId).maybeSingle();
      if (error) throw error;
      return data as SpinResult | null;
    },
  });
}

export function useSpin(bookingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => rpc<SpinResult>("spin_wheel", { p_booking_id: bookingId }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["spin", bookingId] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

/** Personal: confirmar un pago recibido en el local y cobrar con gift card. */
export const useConfirmPayment = () =>
  useMutation({ mutationFn: (orderId: string) => rpc<{ kind: string }>("confirm_payment", { p_order_id: orderId }) });
export const useRedeemGiftCard = () =>
  useMutation({
    mutationFn: (v: { id: string; amount: number }) => rpc<number>("redeem_gift_card", { p_gift_card_id: v.id, p_amount: v.amount }),
  });
