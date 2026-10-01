import { Check, ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { Card, palette, space, StatusBadge, Text, useTheme } from "@/design";
import { vehicleLabel } from "@/features/garage/vehicle";
import { currentLocale, getCopy } from "@/i18n";
import { formatPrice } from "@/lib/price";
import { formatDateLong, formatTime } from "@/lib/time";
import type { BookingStatus } from "@/shared/database";
import type { MyBooking } from "./api";
import { STATUS_STYLE } from "./status";

export function BookingCard({ booking, onPress }: { booking: MyBooking; onPress: () => void }) {
  const c = getCopy();
  const locale = currentLocale();
  const theme = useTheme();
  const snap = booking.price_snapshot;
  const service = locale === "en" ? snap.service_name_en : snap.service_name_es;
  const addons = (snap.services ?? []).map((s) => (locale === "en" ? s.name_en : s.name_es));
  const when = `${formatDateLong(booking.starts_at, locale)} · ${formatTime(booking.starts_at, locale)}`;
  const vehicle = booking.vehicle ? [vehicleLabel(booking.vehicle, c), booking.vehicle.plate].filter(Boolean).join(" · ") : null;
  const amount = formatPrice(snap.amount, snap.currency, locale) ?? c.book.priceToConfirm;
  const style = STATUS_STYLE[booking.status];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[service, ...addons, when, vehicle, amount, c.status[booking.status]].filter(Boolean).join(", ")}
      onPress={onPress}
    >
      <Card style={styles.card}>
        <View style={styles.body}>
          <StatusBadge label={c.status[booking.status]} tone={style.tone} icon={style.icon} />
          <Text variant="displaySm">{service}</Text>
          {addons.length > 0 ? <Text tone="muted">{addons.map((a) => `+ ${a}`).join("  ")}</Text> : null}
          <Text>{when}</Text>
          {vehicle ? <Text tone="muted">{vehicle}</Text> : null}
          <Text variant="label">{amount}</Text>
        </View>
        <ChevronRight color={theme.fgMuted} size={20} />
      </Card>
    </Pressable>
  );
}

const STEPS: BookingStatus[] = ["confirmed", "checked_in", "in_progress", "quality_check", "ready", "completed"];

/**
 * C02: avance del servicio para el cliente según el estado real que registra el personal (no se simula ni se
 * estima nada aquí). Cancelada o no asistió no muestran pasos.
 */
export function ServiceProgress({ status }: { status: BookingStatus }) {
  const c = getCopy();
  const theme = useTheme();
  const current = STEPS.indexOf(status);
  if (current < 0) return null;
  return (
    <View style={styles.steps} accessibilityRole="progressbar" accessibilityLabel={c.booking.progress(c.status[status], current + 1, STEPS.length)}>
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={step} style={styles.step}>
            <View
              style={[
                styles.dot,
                { borderColor: done || active ? palette.cyan : theme.lineStrong },
                done && { backgroundColor: palette.brand },
                active && { backgroundColor: palette.cyan },
              ]}
            >
              {done ? <Check size={12} color="#ffffff" strokeWidth={3} /> : null}
            </View>
            <Text variant="bodySm" tone={active ? "fg" : "muted"} style={[styles.stepLabel, active && { fontWeight: "600" }]}>
              {c.status[step]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center" },
  body: { flex: 1, gap: space.xs + 2 },
  steps: { flexDirection: "row", flexWrap: "wrap", rowGap: space.sm },
  step: { width: "33.33%", alignItems: "center", gap: 4 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  stepLabel: { textAlign: "center", fontSize: 12, lineHeight: 15 },
});
