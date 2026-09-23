import { router, Stack } from "expo-router";
import { History as HistoryIcon } from "lucide-react-native";
import { ActivityIndicator, View } from "react-native";
import { Button, EmptyState, palette, Screen, space } from "@/design";
import { useBookingHistory } from "@/features/booking/api";
import { BookingCard } from "@/features/booking/BookingCard";
import { getCopy } from "@/i18n";

export default function History() {
  const c = getCopy();
  const history = useBookingHistory();

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen options={{ title: c.history.title }} />
      {history.isLoading ? (
        <ActivityIndicator color={palette.cyan} />
      ) : (history.data ?? []).length === 0 ? (
        <EmptyState icon={HistoryIcon} title={c.history.empty} />
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
