import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { space } from "../tokens";
import { useTheme } from "../theme";
import { Button } from "./Button";
import { Text } from "./Text";

type Action = { label: string; onPress: () => void };

/** Estado vacío honesto: explica qué pasa y ofrece una acción real (nunca datos de relleno). */
export function EmptyState({ icon: Icon, title, body, action }: { icon?: LucideIcon; title: string; body?: string; action?: Action }) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      {Icon ? <Icon size={32} color={theme.accent} strokeWidth={1.5} /> : null}
      <Text variant="displaySm" style={styles.center}>
        {title}
      </Text>
      {body ? (
        <Text tone="muted" style={styles.center}>
          {body}
        </Text>
      ) : null}
      {action ? <Button variant="ghost" label={action.label} onPress={action.onPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: space.md, paddingVertical: space.xxxl, paddingHorizontal: space.lg },
  center: { textAlign: "center" },
});
