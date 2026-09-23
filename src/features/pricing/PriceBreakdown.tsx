import { StyleSheet, View } from "react-native";
import { space, status, Text, useTheme } from "@/design";
import { currentLocale, getCopy } from "@/i18n";
import type { PriceSnapshot } from "@/shared/database";
import { breakdown } from "./breakdown";

/** Desglose del precio calculado por el servidor (cotización o foto guardada en la reserva). */
export function PriceBreakdown({ snapshot }: { snapshot: PriceSnapshot }) {
  const c = getCopy();
  const theme = useTheme();
  const { lines, total } = breakdown(snapshot, currentLocale(), c);
  const color = (tone: "neutral" | "discount" | "surcharge") =>
    tone === "discount" ? status.success : tone === "surcharge" ? status.warning : theme.fg;

  return (
    <View
      style={{ gap: space.xs }}
      accessible
      accessibilityLabel={`${c.pricing.title}: ${lines.map((l) => `${l.label} ${l.value}`).join(", ")}. ${c.pricing.total} ${total}`}
    >
      {lines.map((l) => (
        <View key={l.key} style={styles.row}>
          <Text style={styles.label} tone={l.tone === "neutral" ? "fg" : "muted"}>
            {l.label}
          </Text>
          <Text style={{ color: color(l.tone) }}>{l.value}</Text>
        </View>
      ))}
      <View style={[styles.row, styles.total, { borderTopColor: theme.line }]}>
        <Text variant="label">{c.pricing.total}</Text>
        <Text variant="displaySm">{total}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: space.md },
  label: { flexShrink: 1 },
  total: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.sm, marginTop: space.xs },
});
