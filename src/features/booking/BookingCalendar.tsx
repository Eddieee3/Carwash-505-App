import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
// Import directo (no el índice @/design): el índice carga las fuentes y así el componente se prueba con Jest.
import { Card } from "@/design/components/Card";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { glass, palette, radius, space, status, touch } from "@/design/tokens";
import { getCopy } from "@/i18n";
import { addDays, BUSINESS_TZ, formatTime, sentenceCase } from "@/lib/time";
import type { Locale } from "@/shared/site";
import type { DayAvailability, Slot } from "./api";
import { dayTone, monthOf, monthWeeks, shiftMonth, slotSummary, splitByPeriod, type DayTone } from "./calendar";

const TAG: Record<Locale, string> = { es: "es-NI", en: "en-US" };
const utcNoon = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
};

function toneColor(tone: DayTone, muted: string): string {
  if (tone === "open") return status.success;
  if (tone === "few") return status.warning;
  if (tone === "full") return status.danger;
  return muted;
}

/**
 * Calendario mensual. Cada día muestra, con color y número, cuántos horarios le quedan libres
 * (datos de available_days, se refrescan solos). Solo se eligen días reservables con horarios libres.
 */
export function MonthCalendar({
  today,
  horizonDays,
  value,
  onChange,
  availability,
  locale,
}: {
  today: string;
  horizonDays: number;
  value: string;
  onChange: (day: string) => void;
  availability: DayAvailability[] | undefined;
  locale: Locale;
}) {
  const theme = useTheme();
  const c = getCopy(locale);
  const lastBookable = addDays(today, Math.max(1, horizonDays) - 1);
  const [month, setMonth] = useState(monthOf(value));
  const weeks = monthWeeks(month, today, lastBookable);
  const byDay = new Map((availability ?? []).map((a) => [a.day, a]));
  const canPrev = month > monthOf(today);
  const canNext = shiftMonth(month, 1) <= lastBookable;
  const weekdayFmt = new Intl.DateTimeFormat(TAG[locale], { timeZone: "UTC", weekday: "short" });
  const longFmt = new Intl.DateTimeFormat(TAG[locale], { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
  const monthLabel = new Intl.DateTimeFormat(TAG[locale], { timeZone: "UTC", month: "long", year: "numeric" }).format(utcNoon(month));

  return (
    <Card accessibilityLabel={c.book.calendar}>
      <View style={styles.header}>
        <NavButton label={c.book.prevMonth} disabled={!canPrev} onPress={() => setMonth(shiftMonth(month, -1))} icon="prev" />
        <Text variant="displaySm" accessibilityRole="header">
          {sentenceCase(monthLabel)}
        </Text>
        <NavButton label={c.book.nextMonth} disabled={!canNext} onPress={() => setMonth(shiftMonth(month, 1))} icon="next" />
      </View>

      <View style={styles.row}>
        {weeks[0].map((d) => (
          <Text key={d.day} variant="bodySm" tone="muted" style={styles.weekday}>
            {weekdayFmt.format(utcNoon(d.day)).replace(".", "")}
          </Text>
        ))}
      </View>

      <View accessibilityRole="radiogroup" accessibilityLabel={c.book.day} style={{ gap: space.xs }}>
        {weeks.map((week) => (
          <View key={week[0].day} style={styles.row}>
            {week.map((cell) => {
              if (!cell.inMonth) return <View key={cell.day} style={styles.cell} />;
              const info = byDay.get(cell.day);
              const tone: DayTone = cell.inRange && info ? dayTone(info.total, info.free) : "closed";
              const selectable = cell.inRange && (info === undefined || info.free > 0);
              const selected = cell.day === value;
              const color = toneColor(tone, theme.line);
              const detail = !cell.inRange
                ? ""
                : !info
                  ? ""
                  : tone === "closed"
                    ? c.book.closedDay
                    : tone === "full"
                      ? c.book.legendFull
                      : tone === "few"
                        ? `${c.book.legendFew}, ${c.book.dayFree(info.free)}`
                        : `${c.book.legendFree}, ${c.book.dayFree(info.free)}`;
              return (
                <Pressable
                  key={cell.day}
                  accessibilityRole="radio"
                  accessibilityLabel={`${longFmt.format(utcNoon(cell.day))}${detail ? `, ${detail}` : ""}`}
                  accessibilityState={{ checked: selected, disabled: !selectable }}
                  disabled={!selectable}
                  onPress={() => onChange(cell.day)}
                  testID={`book-day-${cell.day}`}
                  style={({ pressed }) => [
                    styles.cell,
                    styles.day,
                    { borderColor: cell.isToday ? palette.cyan : theme.line },
                    selected && { backgroundColor: palette.brand, borderColor: palette.cyan },
                    pressed && !selected && { borderColor: theme.accent },
                    !cell.inRange && styles.outOfRange,
                  ]}
                >
                  <Text variant="label" style={[selected && { color: "#ffffff" }, tone === "full" && cell.inRange && styles.strike]}>
                    {Number(cell.day.slice(8))}
                  </Text>
                  {cell.inRange && info ? (
                    <>
                      <View style={[styles.bar, { backgroundColor: selected ? "#ffffff" : color }]} />
                      <Text variant="bodySm" numberOfLines={1} style={[styles.dayDetail, { color: selected ? "#ffffff" : color }]}>
                        {tone === "open" || tone === "few" ? info.free : detail}
                      </Text>
                    </>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        <Legend color={status.success} label={c.book.legendFree} />
        <Legend color={status.warning} label={c.book.legendFew} />
        <Legend color={status.danger} label={c.book.legendFull} />
        <Legend color={theme.lineStrong} label={c.book.closedDay} />
      </View>
    </Card>
  );
}

function NavButton({ label, disabled, onPress, icon }: { label: string; disabled: boolean; onPress: () => void; icon: "prev" | "next" }) {
  const theme = useTheme();
  const Icon = icon === "prev" ? ChevronLeft : ChevronRight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.nav, { borderColor: theme.line }, disabled && styles.outOfRange]}
    >
      <Icon size={20} color={theme.fg} />
    </Pressable>
  );
}

const hourFmt = new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TZ, hour: "numeric", hourCycle: "h23" });

/** Horas del día elegido, separadas en mañana y tarde: libres (con cupos) o reservadas (tachadas). */
export function TimePanel({
  slots,
  value,
  onChange,
  locale,
  title,
}: {
  slots: Slot[];
  value: string | null;
  onChange: (slotStart: string) => void;
  locale: Locale;
  title: string;
}) {
  const theme = useTheme();
  const c = getCopy(locale);
  const { free } = slotSummary(slots);
  const { morning, afternoon } = splitByPeriod(slots, (s) => Number(hourFmt.format(new Date(s.slot_start))));

  return (
    <Card>
      <Text variant="displaySm">
        {sentenceCase(title)}
      </Text>
      <Text variant="bodySm" tone="muted">
        {c.book.availability(free, slots.length)}
      </Text>
      <View style={styles.legend}>
        <Legend color={status.success} label={c.book.legendFree} />
        <Legend color={theme.lineStrong} label={c.book.legendBooked} />
        <Legend color={palette.cyan} label={c.book.legendSelected} filled />
      </View>
      {[
        { key: "morning", label: c.book.morning, list: morning },
        { key: "afternoon", label: c.book.afternoon, list: afternoon },
      ]
        .filter((g) => g.list.length > 0)
        .map((g) => (
          <View key={g.key} style={{ gap: space.sm }}>
            <Text variant="eyebrow" tone="accent">
              {g.label}
            </Text>
            <View accessibilityRole="radiogroup" accessibilityLabel={`${c.book.time}: ${g.label}`} style={styles.grid}>
              {g.list.map((s) => {
                const booked = s.free_bays === 0;
                const selected = s.slot_start === value;
                const time = formatTime(s.slot_start, locale);
                const detail = booked ? c.book.legendBooked : c.book.freeSeats(s.free_bays);
                return (
                  <Pressable
                    key={s.slot_start}
                    accessibilityRole="radio"
                    accessibilityLabel={`${time}, ${detail}`}
                    accessibilityState={{ checked: selected, disabled: booked }}
                    disabled={booked}
                    onPress={() => onChange(s.slot_start)}
                    testID={`book-slot-${s.slot_start}`}
                    style={({ pressed }) => [
                      styles.slot,
                      { borderColor: booked ? theme.line : status.success, backgroundColor: glass.bg },
                      selected && { backgroundColor: palette.brand, borderColor: palette.cyan },
                      pressed && !selected && { borderColor: theme.accent },
                      booked && styles.slotBooked,
                    ]}
                  >
                    <Text variant="label" style={[selected && { color: "#ffffff" }, booked && styles.strike]}>
                      {time}
                    </Text>
                    <Text variant="bodySm" style={{ color: selected ? "rgba(255,255,255,0.85)" : booked ? theme.fgMuted : status.success }}>
                      {detail}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
    </Card>
  );
}

function Legend({ color, label, filled = false }: { color: string; label: string; filled?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { borderColor: color }, filled ? { backgroundColor: palette.brand } : { backgroundColor: color }]} />
      <Text variant="bodySm" tone="muted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  capitalize: { textTransform: "capitalize" },
  nav: { width: touch.min, height: touch.min, borderWidth: 1, borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", gap: space.xs },
  weekday: { flex: 1, textAlign: "center", textTransform: "capitalize" },
  cell: { flex: 1, minHeight: 64 },
  day: {
    borderWidth: 1,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space.xs,
    gap: 3,
  },
  bar: { width: "60%", height: 4, borderRadius: 2 },
  dayDetail: { fontSize: 11, lineHeight: 13 },
  outOfRange: { opacity: 0.3 },
  strike: { textDecorationLine: "line-through" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: space.lg },
  legendItem: { flexDirection: "row", alignItems: "center", gap: space.xs },
  swatch: { width: 12, height: 12, borderRadius: 3, borderWidth: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  slot: {
    flexGrow: 1,
    flexBasis: 96,
    maxWidth: 140,
    minHeight: touch.min + 10,
    borderWidth: 1,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space.xs,
  },
  slotBooked: { opacity: 0.5 },
});
