import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { gutter, space } from "../tokens";
import { useTheme } from "../theme";
import { Backdrop } from "./Backdrop";

/** Contenedor de pantalla: fondo del tema, márgenes de 16 (gutter de la web) y teclado sin tapar campos. */
export function Screen({ children, edges = ["top", "bottom"] }: { children: ReactNode; edges?: Edge[] }) {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.bg }]} edges={edges}>
      <Backdrop />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // U01: margen inferior extra para que el último contenido nunca quede pegado o tapado por la barra de pestañas.
  content: { flexGrow: 1, padding: gutter, paddingBottom: gutter + space.xxl, gap: space.xl },
});
