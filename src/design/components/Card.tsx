import { StyleSheet, View, type ViewProps } from "react-native";
import { radius, space } from "../tokens";
import { useTheme } from "../theme";

/** Panel con borde de 1 px y radio `panel`, como las tarjetas de la web. */
export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.bgRaised, borderColor: theme.line }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.panel, padding: space.lg, gap: space.md },
});
