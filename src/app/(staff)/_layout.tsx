import { Stack } from "expo-router";
import { palette } from "@/design";

/** Colaborador: una sola pantalla "Hoy" (tablero). El escáner QR/NFC llega en F3/F7. */
export default function StaffLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.ink } }} />;
}
