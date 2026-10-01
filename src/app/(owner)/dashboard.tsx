import { router } from "expo-router";
import { AlertTriangle, CalendarClock, CarFront, ChevronDown, ChevronUp, CloudRain, Crown, Info, ShieldAlert, UserX, Wrench } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { Button, Card, ChoiceChips, EmptyState, Eyebrow, Field, palette, Screen, space, StatusBadge, Text, touch, useTheme } from "@/design";
import { useBays, useBookingsRealtime, useStaffBoard } from "@/features/board/api";
import { todayOverview } from "@/features/board/model";
import { Sheet } from "@/features/board/sheets";
import { bookingErrorMessage } from "@/features/booking/errors";
import { STATUS_STYLE } from "@/features/booking/status";
import { riskFactorText } from "@/features/operations/risk";
import { useCloseBays, useClosures, useOpeningHours, useOwnerDashboard, useReopen } from "@/features/owner/api";
import { currentLocale, getCopy } from "@/i18n";
import { formatPrice } from "@/lib/price";
import { closingTime, formatTime, localDate } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import { BOOKING_STATUSES, type BayClosureRow, type BayKind } from "@/shared/database";

const KINDS: BayKind[] = ["wash", "interior", "detail", "cabin"];
type Money = { currency: string; amount: number }[];

/**
 * Dashboard del propietario (A01): primero lo necesario para operar hoy (citas, en proceso, bahías libres, próxima
 * llegada, sin responsable), luego caja (cobrado real, previsto y pendientes), tareas y stock; las estadísticas al final.
 * Los avisos sin casos se compactan (A02). Cierre por clima con motivo, vigencia y reapertura con historial (B05).
 */
export default function OwnerDashboard() {
  const c = getCopy();
  const locale = currentLocale();
  const today = localDate();
  useBookingsRealtime();

  const dashboard = useOwnerDashboard();
  const board = useStaffBoard(today);
  const bays = useBays();
  const now = useNow();

  const d = dashboard.data;
  const s = d?.summary;
  const o = todayOverview(board.data ?? [], bays.data ?? [], new Date(now));
  const money = (list: Money | undefined) =>
    (list ?? []).map((r) => formatPrice(Number(r.amount), r.currency, locale) ?? `${r.amount} ${r.currency}`).join(" · ");

  return (
    <Screen edges={["top"]}>
      <View style={{ gap: space.sm }}>
        <Eyebrow>{c.owner.eyebrow}</Eyebrow>
        <Text variant="displayLg">{c.owner.title}</Text>
      </View>

      {/* 1 · Operar hoy */}
      <Card>
        <Text variant="eyebrow" tone="accent" accessibilityRole="header">
          {c.dash.now}
        </Text>
        {board.isLoading || bays.isLoading ? (
          <ActivityIndicator color={palette.cyan} accessibilityLabel={c.common.loading} />
        ) : board.isError ? (
          <View style={{ gap: space.sm }}>
            <Text tone="danger">{bookingErrorMessage(board.error, c)}</Text>
            <Button variant="quiet" label={c.common.retry} onPress={() => board.refetch()} />
          </View>
        ) : (
          <>
            <View style={styles.kpis}>
              <Kpi label={c.dash.todayBookings} value={String(o.bookings)} />
              <Kpi label={c.dash.working} value={String(o.working)} />
              <Kpi label={c.dash.delivered} value={String(o.delivered)} />
            </View>
            {(bays.data ?? []).length === 0 ? (
              <Text tone="muted">{c.owner.noBays}</Text>
            ) : (
              <View style={{ gap: space.xs }}>
                <Text variant="label">{c.dash.freeBays}</Text>
                {o.freeBays.map((k) => (
                  <Text key={k.kind} tone={k.free === 0 ? "danger" : "fg"}>
                    {c.dash.freeOfKind(c.dash.bayKinds[k.kind], k.free, k.total)}
                  </Text>
                ))}
              </View>
            )}
            <View style={styles.row}>
              <CalendarClock size={18} color={palette.cyan} />
              <Text style={{ flex: 1 }}>
                {o.next
                  ? c.dash.nextArrival(
                      formatTime(o.next.slot_start, locale),
                      o.next.customer_name ?? c.staff.customer,
                      [o.next.vehicle_label ?? c.garage.kinds[o.next.vehicle_kind], o.next.plate].filter(Boolean).join(" · "),
                    )
                  : c.dash.noNextArrival}
              </Text>
            </View>
            {o.unassigned > 0 ? (
              <View style={{ gap: space.sm }}>
                <StatusBadge label={c.dash.unassigned(o.unassigned)} tone="warning" icon={UserX} />
                <View style={{ alignSelf: "flex-start" }}>
                  <Button variant="ghost" label={c.dash.assignNow} onPress={() => router.push("/board")} testID="dash-assign" />
                </View>
              </View>
            ) : null}
          </>
        )}
      </Card>

      {dashboard.isLoading ? (
        <ActivityIndicator color={palette.cyan} accessibilityLabel={c.common.loading} />
      ) : dashboard.isError || !d || !s ? (
        <EmptyState title={c.errors.generic} action={{ label: c.common.retry, onPress: () => dashboard.refetch() }} />
      ) : (
        <>
          {/* 2 · Caja: cobrado real (pagos) separado de lo previsto */}
          <Card>
            <Text variant="eyebrow" tone="accent" accessibilityRole="header">
              {c.dash.cash}
            </Text>
            <Text variant="label">{c.dash.collectedToday}</Text>
            <Text variant="displayMd">{money(s.collected_revenue ?? s.completed_revenue) || c.dash.nothingCollected}</Text>
            {s.expected_revenue ? (
              <Text tone="muted">
                {c.dash.expected(money(s.expected_revenue.amounts) || "0", s.expected_revenue.pending_quotes)}
              </Text>
            ) : null}
            {(s.pending_payment ?? 0) > 0 ? <StatusBadge label={c.dash.pendingPayment(s.pending_payment ?? 0)} tone="warning" icon={AlertTriangle} /> : null}
            <Text variant="label" tone="muted">
              {c.dash.revenue7}
            </Text>
            <Text>{money(d.revenue_7d) || c.dash.nothingCollected}</Text>
          </Card>

          {/* 3 · Tareas y stock */}
          <Card>
            <Text variant="eyebrow" tone="accent" accessibilityRole="header">
              {c.ops.title}
            </Text>
            <Text>{`${c.dash.tasks}: ${c.dash.tasksLine(d.tasks.overdue, d.tasks.due_today)}`}</Text>
            {d.low_stock.length > 0 ? (
              <>
                <Text variant="label" tone="muted">
                  {c.dash.lowStock}
                </Text>
                {d.low_stock.map((i) => (
                  <StatusBadge key={i.id} label={`${i.name} · ${Number(i.stock)} / ${Number(i.min_stock)} ${c.ops.units[i.unit]}`} tone="warning" icon={AlertTriangle} />
                ))}
              </>
            ) : (
              <Text tone="muted">{c.dash.stockOk}</Text>
            )}
            {d.active_restrictions > 0 ? <StatusBadge label={c.dash.restrictions(d.active_restrictions)} icon={ShieldAlert} /> : null}
            <View style={styles.links}>
              <Button variant="ghost" label={c.dash.toInventory} onPress={() => router.push("/inventory")} />
              <Button variant="ghost" label={c.dash.toTasks} onPress={() => router.push("/team")} />
            </View>
          </Card>

          {/* 4 · Avisos: compactos cuando no hay casos (A02) */}
          <Alerts
            title={c.risk.title}
            icon={AlertTriangle}
            empty={d.risk.length === 0}
            emptyText={c.risk.none}
            explanation={c.risk.hint(d.risk_threshold)}
          >
            {d.risk.map((r) => (
              <View key={r.booking_id} style={{ gap: space.xs }}>
                <Text variant="label">{`${formatTime(r.slot_start, locale)} · ${r.customer_name ?? c.staff.customer} · ${r.reference_code}`}</Text>
                <StatusBadge label={c.risk.score(r.score)} tone="warning" icon={AlertTriangle} />
                {r.factors.map((f) => (
                  <Text key={f.code} variant="bodySm" tone="muted">{`${c.risk.points(f.points)} · ${riskFactorText(f, c)}`}</Text>
                ))}
              </View>
            ))}
          </Alerts>
          <Alerts title={c.dash.vip} icon={Crown} empty={d.vip_present.length === 0} emptyText={c.dash.noVip} explanation={c.dash.vipHint}>
            {d.vip_present.map((v) => (
              <StatusBadge key={v.booking_id} label={`${v.customer_name ?? c.staff.customer} · ${c.status[v.status]}`} tone="warning" icon={Crown} />
            ))}
          </Alerts>
        </>
      )}

      {/* 5 · Cierres por clima o mantenimiento */}
      <ClosuresCard board={board.data ?? []} />

      {/* 6 · Estadísticas (secundario) */}
      {s ? (
        <Card>
          <Text variant="eyebrow" tone="accent" accessibilityRole="header">
            {c.dash.stats}
          </Text>
          {s.occupancy_pct === null ? (
            <Text tone="muted">{c.owner.closedToday}</Text>
          ) : (
            <>
              <Text variant="label">{`${c.owner.occupancy}: ${s.occupancy_pct}%`}</Text>
              <Bar pct={s.occupancy_pct} />
              <Text variant="bodySm" tone="muted">
                {c.dash.occupancyDefinition}
              </Text>
              {(s.by_kind ?? []).map((k) => (
                <View key={k.kind} style={{ gap: 2 }}>
                  <Text variant="bodySm">{c.dash.kindOccupancy(c.dash.bayKinds[k.kind], k.bays, k.occupancy_pct ?? 0)}</Text>
                  <Bar pct={k.occupancy_pct ?? 0} />
                </View>
              ))}
            </>
          )}
          <Text variant="label" tone="muted">
            {c.owner.bookings}
          </Text>
          {BOOKING_STATUSES.filter((st) => (s.counts[st] ?? 0) > 0).map((st) => (
            <View key={st} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <StatusBadge label={c.status[st]} tone={STATUS_STYLE[st].tone} icon={STATUS_STYLE[st].icon} />
              <Text variant="number">{String(s.counts[st])}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpi} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="displayMd">{value}</Text>
      <Text variant="bodySm" tone="muted">
        {label}
      </Text>
    </View>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <View style={styles.barTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
      <View style={{ height: 8, width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: palette.cyan }} />
    </View>
  );
}

/** A02: sin casos, una línea con "¿Qué es?" desplegable; con casos, la lista completa. */
function Alerts({
  title,
  icon: Icon,
  empty,
  emptyText,
  explanation,
  children,
}: {
  title: string;
  icon: typeof Crown;
  empty: boolean;
  emptyText: string;
  explanation: string;
  children: ReactNode;
}) {
  const c = getCopy();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Card style={empty ? { paddingVertical: space.sm } : undefined}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}. ${empty ? emptyText : ""}`}
        onPress={() => setOpen(!open)}
        style={styles.alertHeader}
      >
        <Icon size={18} color={empty ? theme.fgMuted : palette.cyan} />
        <View style={{ flex: 1 }}>
          <Text variant="label">{title}</Text>
          {empty ? (
            <Text variant="bodySm" tone="muted">
              {emptyText}
            </Text>
          ) : null}
        </View>
        <Info size={16} color={theme.fgMuted} />
        {open ? <ChevronUp size={18} color={theme.fgMuted} /> : <ChevronDown size={18} color={theme.fgMuted} />}
      </Pressable>
      {open ? (
        <Text variant="bodySm" tone="muted">
          {explanation || c.dash.noExplanation}
        </Text>
      ) : null}
      {empty ? null : children}
    </Card>
  );
}

/**
 * B05: cerrar un tipo de bahía por clima o mantenimiento, con motivo, vigencia y nota. Antes de confirmar muestra las
 * reservas que quedan dentro del cierre (no se cancelan ni se borran). Reabrir deja el historial.
 */
function ClosuresCard({ board }: { board: { bay_kind: BayKind; status: string; slot_start: string; slot_end: string }[] }) {
  const c = getCopy();
  const locale = currentLocale();
  const today = localDate();
  const now = useNow();
  const hours = useOpeningHours();
  const closures = useClosures();
  const close = useCloseBays();
  const reopen = useReopen();
  const [form, setForm] = useState(false);
  const [kind, setKind] = useState<BayKind>("wash");
  const [reason, setReason] = useState<BayClosureRow["reason"]>("weather");
  const [span, setSpan] = useState<"close" | "1" | "2" | "4">("close");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const closeAt = hours.data ? closingTime(hours.data, today) : null;
  const until = span === "close" ? closeAt : new Date(now + Number(span) * 3_600_000);
  const active = (closures.data ?? []).filter((x) => new Date(x.starts_at).getTime() <= now);
  const affected = until
    ? board.filter(
        (r) =>
          r.bay_kind === kind &&
          ["confirmed", "checked_in", "in_progress", "quality_check", "ready"].includes(r.status) &&
          new Date(r.slot_end).getTime() > now &&
          new Date(r.slot_start).getTime() < until.getTime(),
      ).length
    : 0;
  const fail = (e: unknown) => Alert.alert(bookingErrorMessage(e, c));

  function confirm() {
    if (!until) return;
    Alert.alert(c.dash.closeConfirmTitle(c.dash.bayKinds[kind]), c.dash.closeConfirmBody(formatTime(until, locale), affected), [
      { text: c.common.no, style: "cancel" },
      {
        text: c.common.yes,
        style: "destructive",
        onPress: () =>
          close.mutate(
            { kind, until, reason, note: note.trim() || undefined },
            {
              onSuccess: (r) => {
                setForm(false);
                setNote("");
                setResult(c.dash.closedResult(r.affected_bookings));
              },
              onError: fail,
            },
          ),
      },
    ]);
  }

  return (
    <Card>
      <Text variant="eyebrow" tone="accent" accessibilityRole="header">
        {c.owner.closures}
      </Text>
      {active.length === 0 ? <Text tone="muted">{c.dash.noClosures}</Text> : null}
      {active.map((x) => (
        <View key={x.id} style={{ gap: space.sm }}>
          <StatusBadge
            label={c.dash.closedLine(c.dash.bayKinds[x.bay_kind], c.dash.reasons[x.reason], formatTime(x.ends_at, locale))}
            tone="warning"
            icon={x.reason === "weather" ? CloudRain : Wrench}
          />
          {x.note ? (
            <Text variant="bodySm" tone="muted">
              {x.note}
            </Text>
          ) : null}
          <View style={{ alignSelf: "flex-start" }}>
            <Button
              variant="ghost"
              label={c.owner.reopen}
              onPress={() => reopen.mutate(x.id, { onError: fail })}
              loading={reopen.isPending}
            />
          </View>
        </View>
      ))}
      {result ? (
        <Text variant="bodySm" accessibilityLiveRegion="polite">
          {result}
        </Text>
      ) : null}
      {closeAt === null ? <Text tone="muted">{c.owner.closedToday}</Text> : null}
      {closeAt !== null && closeAt.getTime() > now && !form ? (
        <View style={{ alignSelf: "flex-start" }}>
          <Button variant="ghost" label={c.dash.newClosure} onPress={() => setForm(true)} testID="owner-close-bays" />
        </View>
      ) : null}
      <Sheet visible={form} title={c.dash.newClosure} onClose={() => setForm(false)}>
        <ChoiceChips label={c.dash.closureKind} value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k, label: c.dash.bayKinds[k] }))} />
        <ChoiceChips
          label={c.dash.closureReason}
          value={reason}
          onChange={setReason}
          options={(["weather", "maintenance", "other"] as const).map((r) => ({ value: r, label: c.dash.reasons[r] }))}
        />
        <ChoiceChips
          label={c.dash.closureUntil}
          value={span}
          onChange={setSpan}
          options={[
            { value: "close", label: c.dash.untilClose },
            { value: "1", label: c.dash.forHours(1) },
            { value: "2", label: c.dash.forHours(2) },
            { value: "4", label: c.dash.forHours(4) },
          ]}
        />
        <Field label={c.dash.closureNote} value={note} onChangeText={setNote} maxLength={200} />
        {until ? (
          <View style={styles.row}>
            <CarFront size={18} color={palette.cyan} />
            <Text style={{ flex: 1 }}>{c.dash.closurePreview(formatTime(until, locale), affected)}</Text>
          </View>
        ) : null}
        <Text variant="bodySm" tone="muted">
          {c.dash.closureKeeps}
        </Text>
        <Button label={c.dash.closeNow} onPress={confirm} loading={close.isPending} disabled={!until} />
      </Sheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  kpis: { flexDirection: "row", gap: space.sm },
  kpi: { flex: 1, gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  links: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: palette.surface, overflow: "hidden" },
  alertHeader: { minHeight: touch.min, flexDirection: "row", alignItems: "center", gap: space.sm },
});
