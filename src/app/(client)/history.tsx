import { router, Stack, useLocalSearchParams } from "expo-router";
import { History as HistoryIcon } from "lucide-react-native";
import { ActivityIndicator, View } from "react-native";
import { Button, EmptyState, palette, Screen, space, Text } from "@/design";
import { useBookingHistory } from "@/features/booking/api";
import { BookingCard } from "@/features/booking/BookingCard";
import { useVehicles } from "@/features/garage/api";
import { vehicleLabel } from "@/features/garage/vehicle";
import { getCopy } from "@/i18n";

/**
 * Historial (C05): fecha, vehículo, servicios y adicionales, importe y estado; cada fila abre el detalle guardado.
 * Desde la ficha del vehículo llega filtrado por ese vehículo (V02).
 */
export default function History() {
  const c = getCopy();
  const { vehicle } = useLocalSearchParams<{ vehicle?: string }>();
  const history = useBookingHistory(vehicle ?? null);
  const vehicles = useVehicles();
  const forVehicle = vehicle ? (vehicles.data ?? []).find((v) => v.id === vehicle) : undefined;

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen options={{ title: c.history.title }} />
      {forVehicle ? <Text tone="muted">{c.history.forVehicle(vehicleLabel(forVehicle, c))}</Text> : null}
      {history.isLoading ? (
        <ActivityIndicator color={palette.cyan} accessibilityLabel={c.common.loading} />
      ) : history.isError ? (
        <EmptyState icon={HistoryIcon} title={c.errors.generic} action={{ label: c.common.retry, onPress: () => history.refetch() }} />
      ) : (history.data ?? []).length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title={c.history.empty}
          body={c.history.emptyBody}
          action={{ label: c.history.bookCta, onPress: () => router.push(vehicle ? { pathname: "/book", params: { vehicle } } : "/book") }}
        />
      ) : (
        history.data!.map((b) => (
          <View key={b.id} style={{ gap: space.sm }}>
            <BookingCard booking={b} onPress={() => router.push(`/booking/${b.id}`)} />
            {b.status === "completed" ? (
              <Button
                variant="ghost"
                label={c.history.repeat}
                onPress={() => router.push({ pathname: "/book", params: { service: b.service_id, vehicle: b.vehicle_id } })}
              />
            ) : null}
          </View>
        ))
      )}
    </Screen>
  );
}
