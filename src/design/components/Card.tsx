import { BlurView } from "expo-blur";
import { StyleSheet, View, type ViewProps } from "react-native";
import { glass, radius, space } from "../tokens";

/** Panel de vidrio: desenfoca el fondo ambiental, con borde fino y brillo en el borde superior. */
export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      <BlurView intensity={glass.blur} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.tint, { pointerEvents: "none" }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: glass.border,
    borderTopColor: glass.highlight,
    borderRadius: radius.panel,
    padding: space.lg,
    gap: space.md,
    overflow: "hidden",
  },
  tint: { backgroundColor: glass.bg },
});
