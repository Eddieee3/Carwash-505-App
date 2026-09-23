import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { palette, radius, space, status } from "../tokens";
import { useTheme } from "../theme";
import { Text } from "./Text";

export type BadgeTone = "info" | "success" | "warning" | "danger" | "neutral";

/** Estado con color + ícono + texto: nunca solo color (accesibilidad). */
export function StatusBadge({ label, tone = "neutral", icon: Icon }: { label: string; tone?: BadgeTone; icon?: LucideIcon }) {
  const theme = useTheme();
  const color = tone === "neutral" ? theme.fgMuted : status[tone];
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.badge, { borderColor: color, backgroundColor: tone === "warning" ? "rgba(242,194,0,0.08)" : "transparent" }]}
    >
      {Icon ? <Icon size={14} color={color} strokeWidth={2} /> : null}
      <Text variant="eyebrow" style={{ color: tone === "warning" ? palette.signal : color, letterSpacing: 1.2 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs + 2,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
});
