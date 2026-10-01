import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { router, type Href } from "expo-router";
import { CalendarClock, CarFront, ChevronRight, Crown, History, LifeBuoy, type LucideIcon } from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Button, Card, EmptyState, Eyebrow, palette, radius, Screen, space, Text, touch, useTheme } from "@/design";
import { useMyBookings } from "@/features/booking/api";
import { BookingCard, ServiceProgress } from "@/features/booking/BookingCard";
import { useMyCustomer, useVehiclePhotoUrls, useVehicles } from "@/features/garage/api";
import { vehicleLabel } from "@/features/garage/vehicle";
import { useVipCard } from "@/features/loyalty/api";
import { PromotionsCard } from "@/features/pricing/PromotionsCard";
import { currentLocale, getCopy } from "@/i18n";
import { formatDateLong, formatTime, localDate, sentenceCase, zonedToUtc } from "@/lib/time";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

/**
 * Inicio del cliente (C01): saludo, cita de hoy o próxima cita (fecha, hora y vehículo), vehículo principal, reservar,
 * resumen VIP y accesos a historial y soporte. Promociones en un bloque secundario. Todo con datos reales.
 */
export default function ClientHome() {
  const c = getCopy();
  const locale = currentLocale();
  const theme = useTheme();
  const me = useMyCustomer();
  const bookings = useMyBookings();
  const vehicles = useVehicles();
  const vip = useVipCard();
  const main = (vehicles.data ?? [])[0] ?? null; // el principal va primero
  const photos = useVehiclePhotoUrls(main ? [main] : []);
  const next = (bookings.data ?? [])[0] ?? null;
  const tomorrowStart = zonedToUtc(localDate(), "00:00").getTime() + 86_400_000;
  const isToday = next ? new Date(next.starts_at).getTime() < tomorrowStart : false;
  const firstName = me.data?.full_name?.trim().split(/\s+/)[0];
  const photo = main?.photo_path ? photos.data?.[main.photo_path] : undefined;

  return (
    <Screen edges={["top"]}>
      <View style={{ gap: space.sm }}>
        <Eyebrow>{c.client.homeEyebrow}</Eyebrow>
        <Text variant="displayLg" accessibilityRole="header">
          {firstName ? c.client.greeting(firstName) : c.client.homeTitle}
        </Text>
      </View>

      {/* Próxima cita (o la de hoy) */}
      {bookings.isLoading ? (
        <ActivityIndicator color={palette.cyan} accessibilityLabel={c.common.loading} />
      ) : bookings.isError ? (
        <EmptyState title={c.errors.generic} action={{ label: c.common.retry, onPress: () => bookings.refetch() }} />
      ) : next ? (
        <View style={{ gap: space.sm }}>
          <Text variant="displaySm">{isToday ? c.client.today : c.client.nextBooking}</Text>
          <Text tone="muted">
            {sentenceCase(`${formatDateLong(next.starts_at, locale)} · ${formatTime(next.starts_at, locale)}`)}
          </Text>
          <BookingCard booking={next} onPress={() => router.push(`/booking/${next.id}`)} />
          {next.status !== "confirmed" ? <ServiceProgress status={next.status} /> : null}
          {(bookings.data ?? []).length > 1 ? (
            <Text variant="bodySm" tone="muted">
              {c.client.moreUpcoming((bookings.data ?? []).length - 1)}
            </Text>
          ) : null}
        </View>
      ) : (
        <EmptyState
          icon={CalendarClock}
          title={c.client.noneTitle}
          body={c.client.noneBody}
          action={{ label: c.client.bookCta, onPress: () => router.push("/book") }}
        />
      )}
      {next ? <Button label={c.client.bookCta} onPress={() => router.push("/book")} testID="home-book" /> : null}

      {/* Vehículo principal */}
      {main ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`${c.client.mainVehicle}: ${vehicleLabel(main, c)}`} onPress={() => router.push(`/vehicle/${main.id}`)}>
          <Card style={styles.vehicle}>
            <View style={[styles.thumb, { borderColor: theme.line, backgroundColor: theme.bgRaised }]}>
              {photo ? (
                <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={c.garage.photoAlt(vehicleLabel(main, c))} />
              ) : (
                <CarFront size={26} color={theme.fgMuted} />
              )}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="eyebrow" tone="muted">
                {c.client.mainVehicle}
              </Text>
              <Text variant="label">{vehicleLabel(main, c)}</Text>
              <Text variant="bodySm" tone="muted">
                {main.plate ?? c.garage.noPlate}
              </Text>
            </View>
            <ChevronRight size={20} color={theme.fgMuted} />
          </Card>
        </Pressable>
      ) : vehicles.isLoading ? null : (
        <Button variant="ghost" label={c.book.addVehicle} onPress={() => router.push("/vehicle/new")} />
      )}

      {/* Resumen VIP */}
      {vip.data?.enabled ? (
        <Pressable accessibilityRole="button" onPress={() => router.push("/profile")}>
          <Card style={styles.vehicle}>
            <Crown size={22} color={palette.cyan} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label">{c.vipCard.title}</Text>
              <Text variant="bodySm" tone="muted">
                {vip.data.free_wash_reserved
                  ? c.vipCard.reserved
                  : vip.data.next_is_free
                    ? c.vipCard.nextFree
                    : c.vipCard.summary(vip.data.filled, vip.data.paid_required ?? vip.data.card_slots - 1)}
              </Text>
            </View>
            <ChevronRight size={20} color={theme.fgMuted} />
          </Card>
        </Pressable>
      ) : null}

      {/* Accesos */}
      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        <LinkRow icon={History} label={c.client.history} href="/history" />
        <LinkRow icon={LifeBuoy} label={c.client.tickets} href="/support" />
      </Card>

      {/* Bloque secundario: promociones reales (si las hay) */}
      <PromotionsCard />

      <Button variant="quiet" label={c.common.whatsapp} onPress={() => Linking.openURL(buildWhatsAppUrl())} />
    </Screen>
  );
}

function LinkRow({ icon: Icon, label, href }: { icon: LucideIcon; label: string; href: Href }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={() => router.push(href)} style={styles.link}>
      <Icon size={20} color={theme.accent} />
      <Text style={{ flex: 1 }}>{label}</Text>
      <ChevronRight size={18} color={theme.fgMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  vehicle: { flexDirection: "row", alignItems: "center", gap: space.md },
  thumb: { width: 56, height: 56, borderRadius: radius.control, borderWidth: 1, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  link: { minHeight: touch.min + 4, flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.xs },
});
