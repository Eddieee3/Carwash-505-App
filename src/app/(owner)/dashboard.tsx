import { router } from "expo-router";
import { AlertTriangle, CloudRain, Crown, ShieldAlert } from "lucide-react-native";
import { ActivityIndicator, Alert, View } from "react-native";
import { Button, Card, EmptyState, Eyebrow, palette, Screen, space, StatusBadge, Text } from "@/design";
import { useAuth } from "@/features/auth/AuthProvider";
import { useBays, useBookingsRealtime, useStaffBoard } from "@/features/board/api";
import { bookingErrorMessage } from "@/features/booking/errors";
import { STATUS_STYLE } from "@/features/booking/status";
import { riskFactorText } from "@/features/operations/risk";
import { useClosures, useCloseWash, useOpeningHours, useOwnerDashboard, useReopen } from "@/features/owner/api";
import { currentLocale, getCopy } from "@/i18n";
import { formatPrice } from "@/lib/price";
import { closingTime, formatTime, localDate } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import { BOOKING_STATUSES } from "@/shared/database";

/** Dashboard en vivo del propietario (Realtime + actualización cada minuto). Todo con datos reales del sistema. */
export default function OwnerDashboard() {
  const c = getCopy();
  const locale = currentLocale();
  const today = localDate();
  const { signOut } = useAuth();
  useBookingsRealtime();

  const dashboard = useOwnerDashboard();
  const hours = useOpeningHours();
  const closures = useClosures();
  const board = useStaffBoard(today);
  const bays = useBays();
  const closeWash = useCloseWash();
  const reopen = useReopen();

  const d = dashboard.data;
  const s = d?.summary;
  const now = useNow();
  const washClosures = (closures.data ?? []).filter((x) => x.bay_kind === "wash" && new Date(x.starts_at).getTime() <= now);
  const closeAt = hours.data ? closingTime(hours.data, today) : null;
  const canClose = closeAt !== null && closeAt.getTime() > now && washClosures.length === 0;
  // Reservas de lavado que aún no empiezan: el propietario debe avisarles (push automático en F2).
  const affected = (board.data ?? []).filter(
    (r) => r.bay_kind === "wash" && (r.status === "confirmed" || r.status === "checked_in") && new Date(r.slot_start).getTime() >= now,
  ).length;
  const money = (list: { currency: string; amount: number }[]) =>
    list.map((r) => formatPrice(Number(r.amount), r.currency, locale) ?? `${r.amount} ${r.currency}`);

  function askClose() {
    if (!closeAt) return;
    Alert.alert(c.owner.closeTitle, c.owner.closeBody(affected), [
      { text: c.common.no, style: "cancel" },
      { text: c.common.yes, style: "destructive", onPress: () => closeWash.mutate(closeAt, { onError: (e) => Alert.alert(bookingErrorMessage(e, c)) }) },
    ]);
  }

  return (
    <Screen edges={["top"]}>
      <View style={{ gap: space.sm }}>
        <Eyebrow>{c.owner.eyebrow}</Eyebrow>
        <Text variant="displayLg">{c.owner.title}</Text>
      </View>

      {dashboard.isLoading ? (
        <ActivityIndicator color={palette.cyan} />
      ) : dashboard.isError || !d || !s ? (
        <EmptyState title={c.errors.generic} action={{ label: c.common.retry, onPress: () => dashboard.refetch() }} />
      ) : (
        <>
          <Card>
            <Text variant="eyebrow" tone="accent">
              {c.owner.occupancy}
            </Text>
            {(bays.data ?? []).length === 0 ? (
              <Text tone="muted">{c.owner.noBays}</Text>
            ) : s.occupancy_pct === null ? (
              <Text tone="muted">{c.owner.closedToday}</Text>
            ) : (
              <>
                <Text variant="displayLg">{`${s.occupancy_pct}%`}</Text>
                <Text tone="muted">{c.owner.occupancyHint(s.booked_minutes, s.capacity_minutes)}</Text>
              </>
            )}
          </Card>

          <Card>
            <Text variant="eyebrow" tone="accent">
              {c.risk.title}
            </Text>
            <Text variant="bodySm" tone="muted">
              {c.risk.hint(d.risk_threshold)}
            </Text>
            {d.risk.length === 0 ? <Text tone="muted">{c.risk.none}</Text> : null}
            {d.risk.map((r) => (
              <View key={r.booking_id} style={{ gap: space.xs }}>
                <Text variant="label">{`${formatTime(r.slot_start, locale)} · ${r.customer_name ?? c.staff.customer} · ${r.reference_code}`}</Text>
                <StatusBadge label={c.risk.score(r.score)} tone="warning" icon={AlertTriangle} />
                {r.factors.map((f) => (
                  <Text key={f.code} variant="bodySm" tone="muted">{`${c.risk.points(f.points)} · ${riskFactorText(f, c)}`}</Text>
                ))}
              </View>
            ))}
          </Card>

          <Card>
            <Text variant="eyebrow" tone="accent">
              {c.dash.vip}
            </Text>
            {d.vip_present.length === 0 ? <Text tone="muted">{c.dash.noVip}</Text> : null}
            {d.vip_present.map((v) => (
              <StatusBadge key={v.booking_id} label={`${v.customer_name ?? c.staff.customer} · ${c.status[v.status]}`} tone="warning" icon={Crown} />
            ))}
          </Card>

          <Card>
            <Text variant="eyebrow" tone="accent">
              {c.owner.bookings}
            </Text>
            {BOOKING_STATUSES.filter((st) => (s.counts[st] ?? 0) > 0).length === 0 ? (
              <Text tone="muted">{c.staff.empty}</Text>
            ) : (
              BOOKING_STATUSES.filter((st) => (s.counts[st] ?? 0) > 0).map((st) => (
                <View key={st} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <StatusBadge label={c.status[st]} tone={STATUS_STYLE[st].tone} icon={STATUS_STYLE[st].icon} />
                  <Text variant="number">{String(s.counts[st])}</Text>
                </View>
              ))
            )}
          </Card>

          <Card>
            <Text variant="eyebrow" tone="accent">
              {c.owner.revenue}
            </Text>
            {s.completed_revenue.length === 0 ? (
              <Text tone="muted">{c.owner.noRevenue}</Text>
            ) : (
              money(s.completed_revenue).map((text) => (
                <Text key={text} variant="displayMd">
                  {text}
                </Text>
              ))
            )}
            <Text variant="label" tone="muted">
              {c.dash.revenue7}
            </Text>
            <Text>{d.revenue_7d.length === 0 ? c.owner.noRevenue : money(d.revenue_7d).join(" · ")}</Text>
          </Card>

          <Card>
            <Text variant="eyebrow" tone="accent">
              {c.ops.title}
            </Text>
            <Text>{`${c.dash.tasks}: ${c.dash.tasksLine(d.tasks.overdue, d.tasks.due_today)}`}</Text>
            {d.low_stock.length > 0 ? (
              <>
                <Text variant="label" tone="muted">
                  {c.dash.lowStock}
                </Text>
                {d.low_stock.map((i) => (
                  <StatusBadge
                    key={i.id}
                    label={`${i.name} · ${Number(i.stock)} / ${Number(i.min_stock)} ${c.ops.units[i.unit]}`}
                    tone="warning"
                    icon={AlertTriangle}
                  />
                ))}
              </>
            ) : null}
            {d.active_restrictions > 0 ? <StatusBadge label={c.dash.restrictions(d.active_restrictions)} icon={ShieldAlert} /> : null}
            <Button variant="ghost" label={c.dash.opsCta} onPress={() => router.push("/operations")} testID="owner-operations" />
          </Card>
        </>
      )}

      <Card>
        <Text variant="eyebrow" tone="accent">
          {c.owner.closures}
        </Text>
        {washClosures.map((x) => (
          <View key={x.id} style={{ gap: space.sm }}>
            <StatusBadge label={c.owner.closedUntil(formatTime(x.ends_at, locale))} tone="warning" icon={CloudRain} />
            <Button
              variant="ghost"
              label={c.owner.reopen}
              onPress={() => reopen.mutate(x.id, { onError: (e) => Alert.alert(bookingErrorMessage(e, c)) })}
              loading={reopen.isPending}
            />
          </View>
        ))}
        {washClosures.length === 0 && closeAt === null ? <Text tone="muted">{c.owner.closedToday}</Text> : null}
        {canClose ? (
          <Button variant="ghost" label={c.owner.closeWash} onPress={askClose} loading={closeWash.isPending} testID="owner-close-wash" />
        ) : null}
      </Card>

      <Button variant="quiet" label={c.common.signOut} onPress={signOut} />
    </Screen>
  );
}
