import { Check, Sparkles } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { palette, radius, space, StatusBadge, Text, touch, useTheme } from "@/design";
import { currentLocale, getCopy } from "@/i18n";
import { formatPrice } from "@/lib/price";
import type { BookingExtra } from "@/shared/database";

/** Selección múltiple de extras (casillas). El precio final lo confirma la cotización del servidor. */
export function ExtrasPicker({ extras, value, onChange }: { extras: BookingExtra[]; value: string[]; onChange: (ids: string[]) => void }) {
  const c = getCopy();
  const locale = currentLocale();
  const theme = useTheme();
  if (extras.length === 0) return null;

  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label">{c.pricing.extrasTitle}</Text>
      {extras.map((x) => {
        const checked = value.includes(x.id);
        const name = locale === "en" ? x.name_en : x.name_es;
        const description = locale === "en" ? x.description_en : x.description_es;
        const price = formatPrice(Number(x.price), x.currency, locale) ?? "";
        return (
          <Pressable
            key={x.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={`${name}, ${price}`}
            onPress={() => onChange(checked ? value.filter((id) => id !== x.id) : [...value, x.id])}
            style={[styles.row, { borderColor: checked ? theme.accent : theme.lineStrong }]}
            testID={`extra-${x.id}`}
          >
            <View
              style={[styles.box, { borderColor: checked ? theme.accent : theme.lineStrong, backgroundColor: checked ? theme.accent : "transparent" }]}
            >
              {checked ? <Check size={16} color={palette.ice} strokeWidth={3} /> : null}
            </View>
            <View style={{ flex: 1, gap: space.xs }}>
              <Text variant="label">{name}</Text>
              {description ? (
                <Text variant="bodySm" tone="muted">
                  {description}
                </Text>
              ) : null}
              {x.recommended ? <StatusBadge label={c.pricing.recommended} tone="info" icon={Sparkles} /> : null}
            </View>
            <Text>{price}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touch.min,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: space.md,
  },
  box: { width: 24, height: 24, borderRadius: radius.edit, borderWidth: 2, alignItems: "center", justifyContent: "center" },
});
