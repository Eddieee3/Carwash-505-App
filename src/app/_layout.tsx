import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { palette, ThemeProvider, useAppFonts } from "@/design";
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";
import { usePushNotifications } from "@/features/push/usePushNotifications";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <StatusBar style="light" />
            <RootNavigator fontsReady={fontsLoaded || fontError !== null} />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * Cada zona de la app solo existe para su rol (Stack.Protected). Es una barrera de interfaz:
 * la seguridad real la aplican RLS y las funciones de la base de datos.
 */
function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { view } = useAuth();
  // Recordatorios (cliente) y avisos de no-show (propietario): solo con sesión y rol conocidos.
  usePushNotifications(view === "customer" || view === "operator" || view === "owner");
  // Se monta una sola vez, cuando hay fuentes y se conoce la zona inicial; después nunca se desmonta
  // (una recarga de rol se muestra en `index`, sin perder la navegación).
  const [booted, setBooted] = useState(false);
  if (!booted && fontsReady && view !== "loading") setBooted(true);

  useEffect(() => {
    if (booted) SplashScreen.hideAsync();
  }, [booted]);

  if (!booted) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.ink } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={view === "setup"}>
        <Stack.Screen name="setup" />
      </Stack.Protected>
      <Stack.Protected guard={view === "auth"}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={view === "customer"}>
        <Stack.Screen name="(client)" />
      </Stack.Protected>
      <Stack.Protected guard={view === "operator"}>
        <Stack.Screen name="(staff)" />
      </Stack.Protected>
      <Stack.Protected guard={view === "owner"}>
        <Stack.Screen name="(owner)" />
      </Stack.Protected>
      <Stack.Protected guard={view === "operator" || view === "owner"}>
        <Stack.Screen name="scan" />
        <Stack.Screen name="operations" />
      </Stack.Protected>
      <Stack.Protected guard={view === "blocked"}>
        <Stack.Screen name="no-access" />
      </Stack.Protected>
    </Stack>
  );
}
