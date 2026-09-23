import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/api/supabase";
import type { BookingExtra, Engagement, Promotions, Quote } from "@/shared/database";

async function rpc<T>(fn: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await db().rpc(fn, params);
  if (error) throw error;
  return data as T;
}

/** Precio calculado por el servidor para esa cita (mismo cálculo que guardará book_slot). */
export function useQuote(input: { serviceId: string | null; vehicleId: string | null; startsAt: string | null; addonIds: string[] }) {
  const { serviceId, vehicleId, startsAt, addonIds } = input;
  return useQuery({
    queryKey: ["quote", serviceId, vehicleId, startsAt, [...addonIds].sort().join(",")],
    enabled: !!serviceId && !!vehicleId && !!startsAt,
    queryFn: () =>
      rpc<Quote>("quote_price", { p_service_id: serviceId, p_vehicle_id: vehicleId, p_starts_at: startsAt, p_addon_ids: addonIds }),
    staleTime: 30_000,
  });
}

export function useExtras(serviceId: string | null, vehicleId: string | null) {
  return useQuery({
    queryKey: ["extras", serviceId, vehicleId],
    enabled: !!serviceId && !!vehicleId,
    queryFn: () => rpc<BookingExtra[]>("booking_extras", { p_service_id: serviceId, p_vehicle_id: vehicleId }),
    staleTime: 5 * 60_000,
  });
}

export function usePromotions() {
  return useQuery({ queryKey: ["promotions"], queryFn: () => rpc<Promotions>("my_promotions"), staleTime: 60_000 });
}

export function useEngagement() {
  return useQuery({ queryKey: ["engagement"], queryFn: () => rpc<Engagement>("my_engagement") });
}

export function useSetMarketingPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { consent: boolean; birthday: string | null }) =>
      rpc<void>("set_marketing_preferences", { p_consent: v.consent, p_birthday: v.birthday }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["engagement"] }),
  });
}
