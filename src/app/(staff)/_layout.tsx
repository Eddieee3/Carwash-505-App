import { Stack } from "expo-router";
import { palette } from "@/design";

/** Personal (colaborador y admin del lobby): pantalla "Hoy" (tablero). El lobby abre el escáner desde ahí. */
export default function StaffLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.ink } }} />;
}
