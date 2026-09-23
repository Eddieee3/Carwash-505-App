import * as Linking from "expo-linking";
import { router } from "expo-router";
import { CalendarClock } from "lucide-react-native";
import { ActivityIndicator, View } from "react-native";
import { Button, EmptyState, Eyebrow, palette, Screen, space, Text } from "@/design";
import { useMyBookings } from "@/features/booking/api";
import { BookingCard } from "@/features/booking/BookingCard";
import { PromotionsCard } from "@/features/pricing/PromotionsCard";
import { getCopy } from "@/i18n";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export default function ClientHome() {
  const c = getCopy();
  const bookings = useMyBookings();

  return (
    <Screen edges={["top"]}>
      <View style={{ gap: space.sm }}>
        <Eyebrow>{c.client.homeEyebrow}</Eyebrow>
        <Text variant="displayLg">{c.client.homeTitle}</Text>
      </View>

      <PromotionsCard />

      {bookings.isLoading ? (
        <ActivityIndicator color={palette.cyan} />
      ) : bookings.isError ? (
        <EmptyState title={c.errors.generic} action={{ label: c.common.retry, onPress: () => bookings.refetch() }} />
      ) : (bookings.data ?? []).length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={c.client.noneTitle}
          body={c.client.noneBody}
          action={{ label: c.client.bookCta, onPress: () => router.push("/book") }}
        />
      ) : (
        <View style={{ gap: space.md }}>
          <Text variant="displaySm">{c.client.upcoming}</Text>
          {bookings.data!.map((b) => (
            <BookingCard key={b.id} booking={b} onPress={() => router.push(`/booking/${b.id}`)} />
          ))}
          <Button label={c.client.bookCta} onPress={() => router.push("/book")} testID="home-book" />
        </View>
      )}

      <Button variant="quiet" label={c.common.whatsapp} onPress={() => Linking.openURL(buildWhatsAppUrl())} />
    </Screen>
  );
}
