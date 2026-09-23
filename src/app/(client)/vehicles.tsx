import { router, Stack } from "expo-router";
import { CarFront, ChevronRight } from "lucide-react-native";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Button, Card, EmptyState, palette, Screen, space, StatusBadge, Text, useTheme } from "@/design";
import { useVehicles } from "@/features/garage/api";
import { vehicleLabel } from "@/features/garage/vehicle";
import { getCopy } from "@/i18n";

export default function Vehicles() {
  const c = getCopy();
  const theme = useTheme();
  const vehicles = useVehicles();

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen options={{ title: c.garage.title }} />
      {vehicles.isLoading ? (
        <ActivityIndicator color={palette.cyan} />
      ) : (vehicles.data ?? []).length === 0 ? (
        <EmptyState icon={CarFront} title={c.garage.empty} />
      ) : (
        <View style={{ gap: space.md }}>
          {vehicles.data!.map((v) => (
            <Pressable key={v.id} accessibilityRole="button" onPress={() => router.push(`/vehicle/${v.id}`)}>
              <Card style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1, gap: space.xs }}>
                  {v.is_default ? <StatusBadge label={c.garage.isDefault} tone="info" /> : null}
                  <Text variant="displaySm">{vehicleLabel(v, c)}</Text>
                  <Text tone="muted">{[c.garage.kinds[v.kind], v.plate, v.color].filter(Boolean).join(" · ")}</Text>
                </View>
                <ChevronRight color={theme.fgMuted} size={20} />
              </Card>
            </Pressable>
          ))}
        </View>
      )}
      <Button label={c.garage.add} onPress={() => router.push("/vehicle/new")} testID="vehicles-add" />
    </Screen>
  );
}
