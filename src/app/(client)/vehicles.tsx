import { Image } from "expo-image";
import { router, Stack } from "expo-router";
import { CarFront, ChevronRight } from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Button, Card, EmptyState, palette, radius, Screen, space, StatusBadge, Text, useTheme } from "@/design";
import { useVehiclePhotoUrls, useVehicles } from "@/features/garage/api";
import { vehicleLabel } from "@/features/garage/vehicle";
import { getCopy } from "@/i18n";

/** Mis vehículos: misma identificación (foto, placa, tipo) que el selector de la reserva (V01). */
export default function Vehicles() {
  const c = getCopy();
  const theme = useTheme();
  const vehicles = useVehicles();
  const photos = useVehiclePhotoUrls(vehicles.data);

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen options={{ title: c.garage.title }} />
      {vehicles.isLoading ? (
        <ActivityIndicator color={palette.cyan} accessibilityLabel={c.common.loading} />
      ) : vehicles.isError ? (
        <EmptyState icon={CarFront} title={c.errors.generic} action={{ label: c.common.retry, onPress: () => vehicles.refetch() }} />
      ) : (vehicles.data ?? []).length === 0 ? (
        <EmptyState
          icon={CarFront}
          title={c.garage.empty}
          body={c.garage.emptyBody}
          action={{ label: c.garage.add, onPress: () => router.push("/vehicle/new") }}
        />
      ) : (
        <View style={{ gap: space.md }}>
          {vehicles.data!.map((v) => {
            const label = vehicleLabel(v, c);
            const uri = v.photo_path ? photos.data?.[v.photo_path] : undefined;
            return (
              <Pressable key={v.id} accessibilityRole="button" accessibilityLabel={label} onPress={() => router.push(`/vehicle/${v.id}`)}>
                <Card style={styles.card}>
                  <View style={[styles.thumb, { backgroundColor: theme.bgRaised, borderColor: theme.line }]}>
                    {uri ? (
                      <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={c.garage.photoAlt(label)} />
                    ) : (
                      <CarFront size={28} color={theme.fgMuted} />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: space.xs }}>
                    {v.is_default ? <StatusBadge label={c.garage.isDefault} tone="info" /> : null}
                    <Text variant="displaySm">{label}</Text>
                    <Text tone="muted">
                      {[c.garage.kinds[v.kind], v.plate ?? c.garage.noPlate, v.year, v.color].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                  <ChevronRight color={theme.fgMuted} size={20} />
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}
      {(vehicles.data ?? []).length > 0 ? (
        <Button label={c.garage.add} onPress={() => router.push("/vehicle/new")} testID="vehicles-add" />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: space.md },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.control,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});
