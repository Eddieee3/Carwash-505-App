import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { CalendarX, CarFront, Check, Clock, CloudRain } from "lucide-react-native";
import { useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Button, Card, ChoiceChips, EmptyState, palette, radius, Screen, space, StatusBadge, Text, useTheme } from "@/design";
import {
  useAvailableDays,
  useAvailableSlots,
  useBookableServices,
  useBookingHorizon,
  useBookSlot,
  type BookableService,
} from "@/features/booking/api";
import { MonthCalendar, TimePanel } from "@/features/booking/BookingCalendar";
import { bookingErrorCode, bookingErrorMessage } from "@/features/booking/errors";
import { useVehicles } from "@/features/garage/api";
import { vehicleLabel } from "@/features/garage/vehicle";
import { useClosures } from "@/features/owner/api";
import { useExtras, useQuote } from "@/features/pricing/api";
import { ExtrasPicker } from "@/features/pricing/ExtrasPicker";
import { PriceBreakdown } from "@/features/pricing/PriceBreakdown";
import { currentLocale, getCopy } from "@/i18n";
import { formatPrice, priceForVehicle } from "@/lib/price";
import { addDays, formatDateLong, formatTime, localDate, zonedToUtc } from "@/lib/time";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const WIDE = 900;

/** Reservar: servicio → vehículo → fecha y hora (calendario con disponibilidad en vivo) → confirmar. */
export default function Book() {
  const c = getCopy();
  const locale = currentLocale();
  const today = localDate();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;

  const services = useBookableServices();
  const vehicles = useVehicles();
  const horizon = useBookingHorizon();
  const closures = useClosures();
  const book = useBookSlot();

  // "Repetir lavado" llega con servicio y vehículo preseleccionados.
  const params = useLocalSearchParams<{ service?: string; vehicle?: string }>();
  const [serviceId, setServiceId] = useState<string | null>(params.service ?? null);
  const [chosenVehicle, setChosenVehicle] = useState<string | null>(params.vehicle ?? null);
  const [day, setDay] = useState(today);
  const [slot, setSlot] = useState<string | null>(null);
  const [addons, setAddons] = useState<string[]>([]);
  const [seenParams, setSeenParams] = useState(`${params.service}|${params.vehicle}`);
  if (`${params.service}|${params.vehicle}` !== seenParams) {
    setSeenParams(`${params.service}|${params.vehicle}`);
    setServiceId(params.service ?? null);
    setChosenVehicle(params.vehicle ?? null);
    setSlot(null);
    setAddons([]);
  }
  // Misma clave al reintentar la misma selección (idempotencia); nueva si cambia algo.
  const attempt = useRef<{ signature: string; key: string } | null>(null);

  const vehicle = (vehicles.data ?? []).find((v) => v.id === chosenVehicle) ?? vehicles.data?.[0] ?? null;
  const service = (services.data ?? []).find((s) => s.id === serviceId) ?? null;
  const days = useAvailableDays(service?.id ?? null, vehicle?.kind ?? null);
  const slots = useAvailableSlots(day, service?.id ?? null, vehicle?.kind ?? null);
  const extras = useExtras(service?.id ?? null, vehicle?.id ?? null);
  const quote = useQuote({ serviceId: service?.id ?? null, vehicleId: vehicle?.id ?? null, startsAt: slot, addonIds: addons });

  if (services.isLoading || vehicles.isLoading) {
    return (
      <Screen edges={["top"]}>
        <ActivityIndicator color={palette.cyan} />
      </Screen>
    );
  }

  if ((services.data ?? []).length === 0) {
    return (
      <Screen edges={["top"]}>
        <Text variant="displayLg">{c.book.title}</Text>
        <EmptyState
          icon={CalendarX}
          title={services.isError ? c.errors.generic : c.book.noServicesTitle}
          body={services.isError ? undefined : c.book.noServicesBody}
          action={{ label: c.common.whatsapp, onPress: () => Linking.openURL(buildWhatsAppUrl()) }}
        />
      </Screen>
    );
  }

  if (!vehicle) {
    return (
      <Screen edges={["top"]}>
        <Text variant="displayLg">{c.book.title}</Text>
        <EmptyState
          icon={CarFront}
          title={c.book.noVehiclesTitle}
          body={c.book.noVehiclesBody}
          action={{ label: c.book.addVehicle, onPress: () => router.push("/vehicle/new") }}
        />
      </Screen>
    );
  }

  const priceText = (s: BookableService) => formatPrice(priceForVehicle(s, vehicle.kind), s.currency, locale) ?? c.book.priceToConfirm;
  const durationOf = (s: BookableService) =>
    vehicle.kind === "large"
      ? (s.duration_minutes_large ?? s.duration_minutes_suv)
      : vehicle.kind === "suv"
        ? s.duration_minutes_suv
        : s.duration_minutes_car;

  const dayStart = zonedToUtc(day, "00:00").getTime();
  const dayEnd = zonedToUtc(addDays(day, 1), "00:00").getTime();
  const closedPart =
    service?.bay_kind !== null &&
    (closures.data ?? []).some(
      (x) => x.bay_kind === service?.bay_kind && new Date(x.starts_at).getTime() < dayEnd && new Date(x.ends_at).getTime() > dayStart,
    );
  const dayTitle = `${day === today ? `${c.book.today} · ` : ""}${formatDateLong(zonedToUtc(day, "12:00"), locale)}`;

  function confirm() {
    if (!service || !vehicle || !slot || !quote.data) return;
    const signature = `${service.id}|${vehicle.id}|${slot}|${[...addons].sort().join(",")}`;
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: Crypto.randomUUID() };
    book.mutate(
      {
        serviceId: service.id,
        vehicleId: vehicle.id,
        startsAt: slot,
        idempotencyKey: attempt.current.key,
        addonIds: addons,
        expectedTotal: quote.data.amount,
      },
      {
        onSuccess: (row) => {
          attempt.current = null;
          setSlot(null);
          setAddons([]);
          days.refetch();
          router.push({ pathname: "/booking/[id]", params: { id: row.id, created: "1" } });
        },
        onError: (error) => {
          Alert.alert(bookingErrorMessage(error, c));
          if (bookingErrorCode(error) === "price_changed" || bookingErrorCode(error) === "addon_invalid") {
            attempt.current = null;
            quote.refetch();
            extras.refetch();
          }
          slots.refetch();
          days.refetch();
        },
      },
    );
  }

  const timeContent = !service ? (
    <Text tone="muted">{c.book.pickService}</Text>
  ) : slots.isLoading ? (
    <ActivityIndicator color={palette.cyan} />
  ) : (slots.data ?? []).length === 0 ? (
    <Card>
      <Text variant="displaySm" style={{ textTransform: "capitalize" }}>
        {dayTitle}
      </Text>
      <Text tone="muted">{c.book.noSlots}</Text>
    </Card>
  ) : (
    <TimePanel slots={slots.data ?? []} value={slot} onChange={setSlot} locale={locale} title={dayTitle} />
  );

  return (
    <Screen edges={["top"]}>
      <View style={styles.page}>
        <Text variant="displayLg">{c.book.title}</Text>

        <Step n={1} title={c.book.service} done={!!service}>
          <View style={[styles.services, wide && styles.servicesWide]}>
            {(services.data ?? []).map((s) => (
              <ServiceCard
                key={s.id}
                name={locale === "en" ? s.name_en : s.name_es}
                price={priceText(s)}
                duration={durationOf(s) ? c.book.minutes(durationOf(s) as number) : null}
                selected={s.id === serviceId}
                wide={wide}
                onPress={() => {
                  setServiceId(s.id);
                  setSlot(null);
                  setAddons([]);
                }}
                testID={`book-service-${s.id}`}
              />
            ))}
          </View>
        </Step>

        <Step n={2} title={c.book.vehicle} done>
          <ChoiceChips
            label={c.book.vehicle}
            value={vehicle.id}
            onChange={(v) => {
              setChosenVehicle(v);
              setSlot(null);
              setAddons([]);
            }}
            options={(vehicles.data ?? []).map((v) => ({
              value: v.id,
              label: vehicleLabel(v, c),
              sublabel: v.plate ?? c.garage.kinds[v.kind],
            }))}
          />
          <View style={{ alignSelf: "flex-start" }}>
            <Button variant="quiet" label={c.book.addVehicle} onPress={() => router.push("/vehicle/new")} />
          </View>
        </Step>

        <Step n={3} title={c.book.when} done={!!slot}>
          {closedPart ? <StatusBadge label={c.book.closedPart} tone="warning" icon={CloudRain} /> : null}
          <View style={[styles.when, wide && styles.whenWide]}>
            <View style={wide ? styles.calendarCol : undefined}>
              <MonthCalendar
                today={today}
                horizonDays={horizon.data ?? 14}
                value={day}
                onChange={(d) => {
                  setDay(d);
                  setSlot(null);
                }}
                availability={service ? days.data : undefined}
                locale={locale}
              />
            </View>
            <View style={[{ gap: space.sm }, wide && styles.timeCol]}>
              {timeContent}
              {service ? (
                <Text variant="bodySm" tone="muted">
                  {c.book.live}
                </Text>
              ) : null}
            </View>
          </View>
        </Step>

        {service && slot ? (
          <Step n={4} title={c.book.summary} done={false}>
            <Card>
              <Text variant="displaySm">{locale === "en" ? service.name_en : service.name_es}</Text>
              <Text style={{ textTransform: "capitalize" }}>{`${formatDateLong(slot, locale)} · ${formatTime(slot, locale)}`}</Text>
              <Text tone="muted">{[vehicleLabel(vehicle, c), vehicle.plate].filter(Boolean).join(" · ")}</Text>
              <ExtrasPicker extras={extras.data ?? []} value={addons} onChange={setAddons} />
              {quote.data ? (
                <PriceBreakdown snapshot={quote.data} />
              ) : quote.isError ? (
                <Text tone="danger">{bookingErrorMessage(quote.error, c)}</Text>
              ) : (
                <Text tone="muted">{c.pricing.quoting}</Text>
              )}
              <Button
                label={c.book.confirm}
                onPress={confirm}
                loading={book.isPending}
                disabled={!quote.data || quote.isFetching}
                testID="book-confirm"
              />
            </Card>
          </Step>
        ) : null}
      </View>
    </Screen>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: space.md }}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepBadge, { borderColor: done ? palette.cyan : theme.lineStrong }, done && { backgroundColor: palette.brand }]}>
          {done ? <Check size={16} color="#ffffff" /> : <Text variant="number">{n}</Text>}
        </View>
        <Text variant="displaySm" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function ServiceCard({
  name,
  price,
  duration,
  selected,
  wide,
  onPress,
  testID,
}: {
  name: string;
  price: string;
  duration: string | null;
  selected: boolean;
  wide: boolean;
  onPress: () => void;
  testID: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={[name, price, duration].filter(Boolean).join(", ")}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.serviceCard,
        wide && styles.serviceCardWide,
        { borderColor: selected ? palette.cyan : theme.line, backgroundColor: selected ? "rgba(11,94,168,0.22)" : theme.bgRaised },
        pressed && !selected && { borderColor: theme.accent },
      ]}
    >
      <View style={styles.serviceTop}>
        <Text variant="label" style={{ flex: 1 }}>
          {name}
        </Text>
        {selected ? <Check size={18} color={palette.cyan} /> : null}
      </View>
      <Text variant="number" style={{ color: palette.cyan }}>
        {price}
      </Text>
      {duration ? (
        <View style={styles.duration}>
          <Clock size={14} color={theme.fgMuted} />
          <Text variant="bodySm" tone="muted">
            {duration}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 1120, alignSelf: "center", gap: space.xxl },
  stepHeader: { flexDirection: "row", alignItems: "center", gap: space.md },
  stepBadge: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  services: { gap: space.sm },
  servicesWide: { flexDirection: "row", flexWrap: "wrap" },
  serviceCard: { borderWidth: 1, borderRadius: radius.control, padding: space.md, gap: space.xs },
  serviceCardWide: { flexGrow: 1, flexBasis: 200, maxWidth: 260 },
  serviceTop: { flexDirection: "row", alignItems: "center", gap: space.sm },
  duration: { flexDirection: "row", alignItems: "center", gap: space.xs },
  when: { gap: space.lg },
  whenWide: { flexDirection: "row", alignItems: "flex-start" },
  calendarCol: { flex: 1, maxWidth: 520 },
  timeCol: { flex: 1 },
});
