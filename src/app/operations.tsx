import { Stack } from "expo-router";
import { fonts, palette, Screen } from "@/design";
import { useAuth } from "@/features/auth/AuthProvider";
import { OperationsScreen } from "@/features/operations/OperationsScreen";
import { getCopy } from "@/i18n";

/** Insumos y tareas: colaborador (consumo y tareas) y propietario (además compras y ajustes). */
export default function Operations() {
  const c = getCopy();
  const { view } = useAuth();
  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: c.ops.title,
          headerStyle: { backgroundColor: palette.ink },
          headerTintColor: palette.ice,
          headerTitleStyle: { fontFamily: fonts.display.semibold },
        }}
      />
      <OperationsScreen owner={view === "owner"} />
    </Screen>
  );
}
