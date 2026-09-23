import { Pressable, StyleSheet, View } from "react-native";
import { palette, radius, space, touch } from "../tokens";
import { useTheme } from "../theme";
import { Text } from "./Text";

export type ChoiceOption<T extends string> = { value: T; label: string; sublabel?: string; disabled?: boolean };

/**
 * Selector de una opción (servicio, vehículo, día, hora). Accesible como grupo de radios.
 * Las opciones deshabilitadas se muestran tachadas, no se ocultan (p. ej. horas llenas).
 */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  label,
  layout = "wrap",
  testIDPrefix,
}: {
  options: ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
  layout?: "wrap" | "column";
  testIDPrefix?: string;
}) {
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={layout === "wrap" ? styles.wrap : styles.column}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.sublabel ? `${o.label}, ${o.sublabel}` : o.label}
            accessibilityState={{ checked: selected, disabled: !!o.disabled }}
            disabled={o.disabled}
            onPress={() => onChange(o.value)}
            testID={testIDPrefix ? `${testIDPrefix}-${o.value}` : undefined}
            style={({ pressed }) => [
              styles.chip,
              layout === "column" && styles.chipColumn,
              { borderColor: selected ? palette.cyan : theme.lineStrong, backgroundColor: selected ? palette.brand : theme.bgRaised },
              pressed && !selected && { borderColor: theme.accent },
              o.disabled && styles.disabled,
            ]}
          >
            <Text variant="label" style={[selected && { color: "#ffffff" }, o.disabled && styles.strike]}>
              {o.label}
            </Text>
            {o.sublabel ? (
              <Text variant="bodySm" tone="muted" style={selected && { color: "rgba(255,255,255,0.8)" }}>
                {o.sublabel}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  column: { gap: space.sm },
  chip: {
    minHeight: touch.min,
    minWidth: 72,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderWidth: 1,
    borderRadius: radius.control,
    justifyContent: "center",
    alignItems: "center",
  },
  chipColumn: { alignItems: "flex-start", paddingVertical: space.md, gap: 2 },
  disabled: { opacity: 0.4 },
  strike: { textDecorationLine: "line-through" },
});
