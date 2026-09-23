import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { CalendarX, CarFront, CloudRain } from "lucide-react-native";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { Button, Card, ChoiceChips, EmptyState, palette, Screen, space, StatusBadge, Text } from "@/design";
import { useAvailableSlots, useBookableServices, useBookingHorizon, useBookSlot } from "@/features/booking/api";
import { bookingErrorCode, bookingErrorMessage } from "@/features/booking/errors";
import { useVehicles } from "@/features/garage/api";
import { vehicleLabel } from "@/features/garage/vehicle";
import { useClosures } from "@/features/owner/api";
import { useExtras, useQuote } from "@/features/pricing/api";
import { ExtrasPicker } from "@/features/pricing/ExtrasPicker";
import { PriceBreakdown } from "@/features/pricing/PriceBreakdown";
import { currentLocale, getCopy } from "@/i18n";
import { formatPrice, priceForVehicle } from "@/lib/price";
import { addDays, dayLabel, formatDateLong, formatTime, localDate, nextDays, zonedToUtc } from "@/lib/time";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

/** Reservar en una pantalla: servicio → vehículo → día → hora → confirmar. */
export default function Book() {
  const c = getCopy();
  const locale = currentLocale();
  const today = localDate();

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

  const priceText = (s: NonNullable<typeof service>) =>
    formatPrice(priceForVehicle(s, vehicle.kind), s.currency, locale) ?? c.book.priceToConfirm;

  const dayStart = zonedToUtc(day, "00:00").getTime();
  const dayEnd = zonedToUtc(addDays(day, 1), "00:00").getTime();
  const closedPart =
    service?.bay_kind !== null &&
    (closures.data ?? []).some(
      (x) => x.bay_kind === service?.bay_kind && new Date(x.starts_at).getTime() < dayEnd && new Date(x.ends_at).getTime() > dayStart,
    );

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
        },
      },
    );
  }

  return (
    <Screen edges={["top"]}>
      <Text variant="displayLg">{c.book.title}</Text>

      <View style={{ gap: space.sm }}>
        <Text variant="displaySm">{c.book.service}</Text>
        <ChoiceChips
          label={c.book.service}
          layout="column"
          value={serviceId}
          onChange={(v) => {
            setServiceId(v);
            setSlot(null);
            setAddons([]);
          }}
          options={(services.data ?? []).map((s) => ({
            value: s.id,
            label: locale === "en" ? s.name_en : s.name_es,
            sublabel: priceText(s),
          }))}
          testIDPrefix="book-service"
        />
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="displaySm">{c.book.vehicle}</Text>
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
        <Button variant="quiet" label={c.book.addVehicle} onPress={() => router.push("/vehicle/new")} />
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="displaySm">{c.book.day}</Text>
        <ChoiceChips
          label={c.book.day}
          value={day}
          onChange={(d) => {
            setDay(d);
            setSlot(null);
          }}
          options={nextDays(today, horizon.data ?? 14).map((d) => ({ value: d, label: dayLabel(d, today, locale, c.book) }))}
          testIDPrefix="book-day"
        />
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="displaySm">{c.book.time}</Text>
        {closedPart ? <StatusBadge label={c.book.closedPart} tone="warning" icon={CloudRain} /> : null}
        {!service ? (
          <Text tone="muted">{c.book.pickService}</Text>
        ) : slots.isLoading ? (
          <ActivityIndicator color={palette.cyan} />
        ) : (slots.data ?? []).every((s) => s.free_bays === 0) ? (
          <Text tone="muted">{c.book.noSlots}</Text>
        ) : (
          <>
            <ChoiceChips
              label={c.book.time}
              value={slot}
              onChange={setSlot}
              options={(slots.data ?? []).map((s) => ({
                value: s.slot_start,
                label: formatTime(s.slot_start, locale),
                disabled: s.free_bays === 0,
              }))}
              testIDPrefix="book-slot"
            />
            <Text variant="bodySm" tone="muted">
              {c.book.live}
            </Text>
          </>
        )}
      </View>

      {service && slot ? (
        <Card>
          <Text variant="eyebrow" tone="accent">
            {c.book.summary}
          </Text>
          <Text variant="displaySm">{locale === "en" ? service.name_en : service.name_es}</Text>
          <Text>{`${formatDateLong(slot, locale)} · ${formatTime(slot, locale)}`}</Text>
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
      ) : null}
    </Screen>
  );
}
