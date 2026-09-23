import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from "react-native";
import { palette, radius, space, touch } from "../tokens";
import { useTheme } from "../theme";
import { Text } from "./Text";

type Variant = "primary" | "ghost" | "quiet";

export type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
};

/** Equivalente a `.btn-primary | .btn-ghost | .btn-quiet` de la web. */
export function Button({ label, variant = "primary", loading = false, disabled, ...rest }: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const fg = variant === "primary" ? "#ffffff" : variant === "ghost" ? theme.fg : theme.accent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && {
          backgroundColor: pressed ? palette.brandHover : palette.brand,
          borderColor: "rgba(66,200,245,0.45)",
        },
        variant === "ghost" && { borderColor: pressed ? theme.accent : theme.lineStrong },
        variant === "quiet" && styles.quiet,
        isDisabled && styles.disabled,
      ]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={fg} /> : null}
      <Text variant="button" style={{ color: fg }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch.min,
    paddingHorizontal: space.xl - 4,
    paddingVertical: space.md - 2,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  quiet: { paddingHorizontal: space.xs, backgroundColor: "transparent" },
  disabled: { opacity: 0.55 },
});
