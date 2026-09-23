import { Stack } from "expo-router";
import { fonts, palette } from "@/design";

/** Cliente: pestañas + pantallas encima (vehículos, detalle de reserva) con cabecera de la marca. */
export default function ClientLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: palette.ink },
        headerStyle: { backgroundColor: palette.ink },
        headerTintColor: palette.ice,
        headerTitleStyle: { fontFamily: fonts.display.semibold },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
