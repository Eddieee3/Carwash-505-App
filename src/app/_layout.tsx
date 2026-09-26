import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { palette, ThemeProvider, useAppFonts } from "@/design";
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";
import { LaunchAnimation } from "@/features/launch/LaunchAnimation";
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
  usePushNotifications(view === "customer" || view === "operator" || view === "lobby" || view === "owner");
  // Se monta una sola vez, cuando hay fuentes y se conoce la zona inicial; después nunca se desmonta
  // (una recarga de rol se muestra en `index`, sin perder la navegación).
  const [booted, setBooted] = useState(false);
  if (!booted && fontsReady && view !== "loading") setBooted(true);
  // Animación de apertura con el logo: oculta la pantalla de carga nativa y tapa la app hasta que está lista.
  const [introDone, setIntroDone] = useState(false);

  return (
    <>
      {booted ? <Navigator view={view} /> : null}
      {introDone ? null : <LaunchAnimation ready={booted} onDone={() => setIntroDone(true)} />}
    </>
  );
}

function Navigator({ view }: { view: ReturnType<typeof useAuth>["view"] }) {
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
      <Stack.Protected guard={view === "operator" || view === "lobby"}>
        <Stack.Screen name="(staff)" />
      </Stack.Protected>
      <Stack.Protected guard={view === "owner"}>
        <Stack.Screen name="(owner)" />
      </Stack.Protected>
      {/* Recepción (escanear, cobrar, lavado sin cita): dueño y admin del lobby. La BD aplica lo mismo (is_front_desk). */}
      <Stack.Protected guard={view === "lobby" || view === "owner"}>
        <Stack.Screen name="scan" />
      </Stack.Protected>
      <Stack.Protected guard={view === "operator" || view === "lobby" || view === "owner"}>
        <Stack.Screen name="operations" />
      </Stack.Protected>
      <Stack.Protected guard={view === "blocked"}>
        <Stack.Screen name="no-access" />
      </Stack.Protected>
    </Stack>
  );
}
