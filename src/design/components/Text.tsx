import { Platform, Text as RNText, StyleSheet, View, type TextProps } from "react-native";
import { iosTopInset, status, type as typeScale, type TypeVariant } from "../tokens";
import { useTheme } from "../theme";

type Tone = "fg" | "muted" | "accent" | "danger";

export type AppTextProps = TextProps & { variant?: TypeVariant; tone?: Tone };

export function Text({ variant = "body", tone = "fg", style, ...rest }: AppTextProps) {
  const theme = useTheme();
  const color = { fg: theme.fg, muted: theme.fgMuted, accent: theme.accent, danger: status.danger }[tone];
  const role = variant.startsWith("display") ? "header" : undefined;
  const inset = Platform.OS === "ios" ? iosTopInset[variant] : undefined;
  return <RNText accessibilityRole={role} style={[typeScale[variant], inset ? { paddingTop: inset } : null, { color }, style]} {...rest} />;
}

/** `.eyebrow` de la web: línea de 32 px + texto en mayúsculas con el color de acento. */
export function Eyebrow({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <View style={styles.eyebrow}>
      <View style={[styles.rule, { backgroundColor: theme.accent }]} />
      <Text variant="eyebrow" tone="accent">
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { flexDirection: "row", alignItems: "center", gap: 12 },
  rule: { width: 32, height: StyleSheet.hairlineWidth * 2 },
});
