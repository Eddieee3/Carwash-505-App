import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { CalendarX, CarFront, Check, Clock, CloudRain, Info, X } from "lucide-react-native";
import { useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { Alert } from "@/lib/alert";
import { Button, Card, ChoiceChips, EmptyState, palette, radius, Screen, space, StatusBadge, Text, touch, useTheme } from "@/design";
import {
  useAddonServices,
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
import { addDays, formatDateLong, formatTime, localDate, sentenceCase, zonedToUtc } from "@/lib/time";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type { AddonService, VehicleKind } from "@/shared/database";

const WIDE = 900;

function durationFor(s: BookableService, kind: VehicleKind): number | null {
  if (kind === "large") return s.duration_minutes_large ?? s.duration_minutes_suv;
  if (kind === "suv") return s.duration_minutes_suv;
  if (kind === "car") return s.duration_minutes_car;
  const all = [s.duration_minutes_car, s.duration_minutes_suv, s.duration_minutes_large].filter((n): n is number => n !== null);
  return all.length ? Math.max(...all) : null;
}

/**
 * Reservar (R05): vehículo → servicio principal → adicionales → fecha y hora → resumen y confirmación.
 * Todo está en una sola pantalla: volver a un paso anterior conserva lo elegido. El precio, la duración y la
 * disponibilidad los calcula el servidor para el vehículo elegido (R03); la app solo los presenta.
 */
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
  const [addonServices, setAddonServices] = useState<string[]>([]);
  const [addons, setAddons] = useState<string[]>([]);
  const [details, setDetails] = useState<BookableService | null>(null);
  const [seenParams, setSeenParams] = useState(`${params.service}|${params.vehicle}`);
  if (`${params.service}|${params.vehicle}` !== seenParams) {
    setSeenParams(`${params.service}|${params.vehicle}`);
    setServiceId(params.service ?? null);
    setChosenVehicle(params.vehicle ?? null);
    setSlot(null);
    setAddonServices([]);
    setAddons([]);
  }
  // Misma clave al reintentar la misma selección (idempotencia: un doble toque no duplica); nueva si cambia algo.
  const attempt = useRef<{ signature: string; key: string } | null>(null);

  const vehicle = (vehicles.data ?? []).find((v) => v.id === chosenVehicle) ?? vehicles.data?.[0] ?? null;
  const service = (services.data ?? []).find((s) => s.id === serviceId) ?? null;
  const addonList = useAddonServices(service?.id ?? null, vehicle?.id ?? null);
  // Solo los adicionales que siguen siendo válidos para este principal.
  const validAddonIds = addonServices.filter((id) => (addonList.data ?? []).some((a) => a.id === id));
  const days = useAvailableDays(service?.id ?? null, vehicle?.kind ?? null, validAddonIds);
  const slots = useAvailableSlots(day, service?.id ?? null, vehicle?.kind ?? null, validAddonIds);
  const extras = useExtras(service?.id ?? null, vehicle?.id ?? null);
  const quote = useQuote({
    serviceId: service?.id ?? null,
    vehicleId: vehicle?.id ?? null,
    startsAt: slot,
    addonIds: addons,
    addonServiceIds: validAddonIds,
  });

  if (services.isLoading || vehicles.isLoading) {
    return (
      <Screen edges={["top"]}>
        <ActivityIndicator color={palette.cyan} accessibilityLabel={c.common.loading} />
      </Screen>
    );
  }

  if ((services.data ?? []).length === 0) {
    return (
      <Screen edges={["top"]}>
        <Text variant="displayLg" accessibilityRole="header">
          {c.book.title}
        </Text>
        <EmptyState
          icon={CalendarX}
          title={services.isError ? c.errors.generic : c.book.noServicesTitle}
          body={services.isError ? undefined : c.book.noServicesBody}
          action={
            services.isError
              ? { label: c.common.retry, onPress: () => services.refetch() }
              : { label: c.common.whatsapp, onPress: () => Linking.openURL(buildWhatsAppUrl()) }
          }
        />
      </Screen>
    );
  }

  if (!vehicle) {
    return (
      <Screen edges={["top"]}>
        <Text variant="displayLg" accessibilityRole="header">
          {c.book.title}
        </Text>
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
  const addonPrice = (a: AddonService) => formatPrice(a.price, a.currency, locale) ?? c.pricing.toQuote;

  const dayStart = zonedToUtc(day, "00:00").getTime();
  const dayEnd = zonedToUtc(addDays(day, 1), "00:00").getTime();
  const closedPart =
    service?.bay_kind !== null &&
    (closures.data ?? []).some(
      (x) => x.bay_kind === service?.bay_kind && new Date(x.starts_at).getTime() < dayEnd && new Date(x.ends_at).getTime() > dayStart,
    );
  const dayTitle = `${day === today ? `${c.book.today} · ` : ""}${formatDateLong(zonedToUtc(day, "12:00"), locale)}`;
  const resetTime = () => setSlot(null);

  function confirm() {
    if (!service || !vehicle || !slot || !quote.data || book.isPending) return;
    const signature = `${service.id}|${vehicle.id}|${slot}|${[...addons].sort().join(",")}|${[...validAddonIds].sort().join(",")}`;
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: Crypto.randomUUID() };
    book.mutate(
      {
        serviceId: service.id,
        vehicleId: vehicle.id,
        startsAt: slot,
        idempotencyKey: attempt.current.key,
        addonIds: addons,
        addonServiceIds: validAddonIds,
        expectedTotal: quote.data.amount,
      },
      {
        onSuccess: (row) => {
          attempt.current = null;
          setSlot(null);
          setAddons([]);
          setAddonServices([]);
          days.refetch();
          router.push({ pathname: "/booking/[id]", params: { id: row.id, created: "1" } });
        },
        onError: (error) => {
          const code = bookingErrorCode(error);
          // B03: si el horario se ocupó, se conserva todo lo elegido y solo se pide otra hora.
          if (code === "slot_taken" || code === "closed") {
            setSlot(null);
            Alert.alert(c.book.slotGone);
          } else {
            Alert.alert(bookingErrorMessage(error, c));
          }
          if (code === "price_changed" || code === "addon_invalid") {
            attempt.current = null;
            quote.refetch();
            extras.refetch();
            addonList.refetch();
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
    <ActivityIndicator color={palette.cyan} accessibilityLabel={c.common.loading} />
  ) : slots.isError ? (
    <Card>
      <Text tone="danger">{bookingErrorMessage(slots.error, c)}</Text>
      <Button variant="quiet" label={c.common.retry} onPress={() => slots.refetch()} />
    </Card>
  ) : (slots.data ?? []).length === 0 ? (
    <Card>
      <Text variant="displaySm">{sentenceCase(dayTitle)}</Text>
      <Text tone="muted">{c.book.noSlots}</Text>
    </Card>
  ) : (
    <TimePanel slots={slots.data ?? []} value={slot} onChange={setSlot} locale={locale} title={dayTitle} />
  );

  const chosenAddons = (addonList.data ?? []).filter((a) => validAddonIds.includes(a.id));
  const totalMinutes = quote.data?.duration_minutes ?? null;

  return (
    <Screen edges={["top"]}>
      <View style={styles.page}>
        <Text variant="displayLg" accessibilityRole="header">
          {c.book.title}
        </Text>

        <Step n={1} title={c.book.vehicle} done>
          <ChoiceChips
            label={c.book.vehicle}
            value={vehicle.id}
            onChange={(v) => {
              setChosenVehicle(v);
              resetTime(); // la duración y el precio dependen del vehículo: se recalculan
            }}
            options={(vehicles.data ?? []).map((v) => ({
              value: v.id,
              label: vehicleLabel(v, c),
              sublabel: [c.garage.kinds[v.kind], v.plate ?? c.book.noPlate].join(" · "),
            }))}
          />
          <View style={{ alignSelf: "flex-start" }}>
            <Button variant="quiet" label={c.book.addVehicle} onPress={() => router.push("/vehicle/new")} />
          </View>
        </Step>

        <Step n={2} title={c.book.mainService} done={!!service}>
          <View style={[styles.services, wide && styles.servicesWide]}>
            {(services.data ?? []).map((s) => {
              const minutes = durationFor(s, vehicle.kind);
              return (
                <ServiceCard
                  key={s.id}
                  name={locale === "en" ? s.name_en : s.name_es}
                  price={priceText(s)}
                  duration={minutes ? c.book.minutes(minutes) : null}
                  selected={s.id === serviceId}
                  wide={wide}
                  onPress={() => {
                    setServiceId(s.id);
                    setAddonServices([]);
                    setAddons([]);
                    resetTime();
                  }}
                  onDetails={() => setDetails(s)}
                  testID={`book-service-${s.id}`}
                />
              );
            })}
          </View>
        </Step>

        {service ? (
          <Step n={3} title={c.book.addons} done={validAddonIds.length > 0}>
            {addonList.isLoading ? (
              <ActivityIndicator color={palette.cyan} accessibilityLabel={c.common.loading} />
            ) : (addonList.data ?? []).length === 0 ? (
              <Text tone="muted">{c.book.addonsNone}</Text>
            ) : (
              <View style={{ gap: space.sm }}>
                <Text variant="bodySm" tone="muted">
                  {c.book.addonsHint}
                </Text>
                {(addonList.data ?? []).map((a) => (
                  <CheckRow
                    key={a.id}
                    checked={validAddonIds.includes(a.id)}
                    title={locale === "en" ? a.name_en : a.name_es}
                    subtitle={[locale === "en" ? a.description_en : a.description_es, `+ ${c.book.minutes(a.duration_minutes)}`]
                      .filter(Boolean)
                      .join(" · ")}
                    trailing={addonPrice(a)}
                    onPress={() => {
                      setAddonServices(validAddonIds.includes(a.id) ? validAddonIds.filter((x) => x !== a.id) : [...validAddonIds, a.id]);
                      resetTime(); // cambia la duración total
                    }}
                    testID={`book-addon-${a.id}`}
                  />
                ))}
              </View>
            )}
          </Step>
        ) : null}

        <Step n={service ? 4 : 3} title={c.book.when} done={!!slot}>
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
          <Step n={5} title={c.book.summary} done={false}>
            <Card>
              <SummaryRow label={c.book.vehicle}>
                <Text variant="label">{vehicleLabel(vehicle, c)}</Text>
                <Text tone="muted">{vehicle.plate ? c.book.plateLabel(vehicle.plate) : c.book.noPlate}</Text>
              </SummaryRow>
              <SummaryRow label={c.book.services}>
                <Text variant="label">{locale === "en" ? service.name_en : service.name_es}</Text>
                {chosenAddons.map((a) => (
                  <Text key={a.id}>{`+ ${locale === "en" ? a.name_en : a.name_es}`}</Text>
                ))}
              </SummaryRow>
              <SummaryRow label={c.book.schedule}>
                <Text>{sentenceCase(`${formatDateLong(slot, locale)} · ${formatTime(slot, locale)}`)}</Text>
                {totalMinutes ? (
                  <View style={styles.duration}>
                    <Clock size={14} color={palette.cyan} />
                    <Text variant="bodySm" tone="muted">
                      {c.book.totalDuration(c.book.minutes(totalMinutes))}
                    </Text>
                  </View>
                ) : null}
              </SummaryRow>
              <ExtrasPicker extras={extras.data ?? []} value={addons} onChange={setAddons} />
              {quote.data ? (
                <>
                  {quote.data.requires_evaluation ? <StatusBadge label={c.pricing.estimated} tone="warning" icon={Info} /> : null}
                  <PriceBreakdown snapshot={quote.data} />
                  {quote.data.requires_evaluation ? (
                    <Text variant="bodySm" tone="muted">
                      {c.book.evaluationNote}
                    </Text>
                  ) : null}
                </>
              ) : quote.isError ? (
                <View style={{ gap: space.sm }}>
                  <Text tone="danger">{bookingErrorMessage(quote.error, c)}</Text>
                  <Button variant="quiet" label={c.common.retry} onPress={() => quote.refetch()} />
                </View>
              ) : (
                <Text tone="muted">{c.pricing.quoting}</Text>
              )}
              <Button
                label={c.book.confirm}
                onPress={confirm}
                loading={book.isPending}
                disabled={!quote.data || quote.isFetching || book.isPending}
                testID="book-confirm"
              />
            </Card>
          </Step>
        ) : null}
      </View>

      <ServiceDetails service={details} kind={vehicle.kind} onClose={() => setDetails(null)} />
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

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="eyebrow" tone="muted">
        {label}
      </Text>
      {children}
    </View>
  );
}

function CheckRow({
  checked,
  title,
  subtitle,
  trailing,
  onPress,
  testID,
}: {
  checked: boolean;
  title: string;
  subtitle?: string;
  trailing: string;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={[title, subtitle, trailing].filter(Boolean).join(", ")}
      onPress={onPress}
      testID={testID}
      style={[styles.checkRow, { borderColor: checked ? theme.accent : theme.lineStrong }]}
    >
      <View style={[styles.box, { borderColor: checked ? theme.accent : theme.lineStrong, backgroundColor: checked ? theme.accent : "transparent" }]}>
        {checked ? <Check size={16} color={palette.ice} strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1, gap: space.xs }}>
        <Text variant="label">{title}</Text>
        {subtitle ? (
          <Text variant="bodySm" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text>{trailing}</Text>
    </Pressable>
  );
}

function ServiceCard({
  name,
  price,
  duration,
  selected,
  wide,
  onPress,
  onDetails,
  testID,
}: {
  name: string;
  price: string;
  duration: string | null;
  selected: boolean;
  wide: boolean;
  onPress: () => void;
  onDetails: () => void;
  testID: string;
}) {
  const theme = useTheme();
  const c = getCopy();
  return (
    <View
      style={[
        styles.serviceCard,
        wide && styles.serviceCardWide,
        { borderColor: selected ? palette.cyan : theme.line, backgroundColor: selected ? "rgba(11,94,168,0.22)" : theme.bgRaised },
      ]}
    >
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={[name, price, duration].filter(Boolean).join(", ")}
        accessibilityState={{ checked: selected }}
        onPress={onPress}
        testID={testID}
        style={{ gap: space.xs }}
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${c.book.seeIncludes}: ${name}`}
        onPress={onDetails}
        hitSlop={8}
        style={styles.detailsLink}
        testID={`${testID}-details`}
      >
        <Info size={16} color={theme.accent} />
        <Text variant="bodySm" style={{ color: theme.accent }}>
          {c.book.seeIncludes}
        </Text>
      </Pressable>
    </View>
  );
}

/** R04: alcance del servicio antes de elegir. Solo muestra datos confirmados que ya están en el catálogo. */
function ServiceDetails({ service, kind, onClose }: { service: BookableService | null; kind: VehicleKind; onClose: () => void }) {
  const c = getCopy();
  const locale = currentLocale();
  const theme = useTheme();
  if (!service) return null;
  const en = locale === "en";
  const description = (en ? service.description_en : service.description_es) || null;
  const includes = (en ? service.includes_en : service.includes_es) ?? [];
  const excludes = (en ? service.excludes_en : service.excludes_es) ?? [];
  const minutes = durationFor(service, kind);
  const prices: { label: string; value: string | null }[] = [
    { label: c.garage.kinds.car, value: formatPrice(service.requires_evaluation ? null : service.price_car, service.currency, locale) },
    { label: c.garage.kinds.suv, value: formatPrice(service.requires_evaluation ? null : service.price_suv, service.currency, locale) },
    { label: c.garage.kinds.large, value: formatPrice(service.requires_evaluation ? null : service.price_large, service.currency, locale) },
  ];
  const hasDetails = !!description || includes.length > 0 || excludes.length > 0;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.bgSheet, borderColor: theme.lineStrong }]} accessibilityViewIsModal>
          <View style={styles.sheetHeader}>
            <Text variant="displaySm" accessibilityRole="header" style={{ flex: 1 }}>
              {en ? service.name_en : service.name_es}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel={c.book.close} onPress={onClose} hitSlop={10} style={styles.close}>
              <X size={22} color={theme.fg} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: space.md }}>
            {description ? <Text>{description}</Text> : null}
            {includes.length > 0 ? (
              <View style={{ gap: space.xs }}>
                <Text variant="label">{c.book.includesTitle}</Text>
                {includes.map((item) => (
                  <View key={item} style={styles.bullet}>
                    <Check size={14} color={palette.cyan} />
                    <Text style={{ flex: 1 }}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {excludes.length > 0 ? (
              <View style={{ gap: space.xs }}>
                {excludes.map((item) => (
                  <Text key={item} tone="muted">{`· ${item}`}</Text>
                ))}
              </View>
            ) : null}
            {!hasDetails ? <Text tone="muted">{c.book.noDetails}</Text> : null}
            {minutes ? <Text>{c.book.durationApprox(c.book.minutes(minutes))}</Text> : null}
            <View style={{ gap: space.xs }}>
              <Text variant="label">{c.book.priceByVehicle}</Text>
              {prices.map((p) => (
                <View key={p.label} style={styles.priceRow}>
                  <Text tone="muted">{p.label}</Text>
                  <Text>{p.value ?? c.pricing.toQuote}</Text>
                </View>
              ))}
              {service.requires_evaluation ? (
                <Text variant="bodySm" tone="muted">
                  {c.book.evaluationNote}
                </Text>
              ) : null}
            </View>
            {service.rain_warranty_hours ? <Text>{c.book.rainWarranty(service.rain_warranty_hours)}</Text> : null}
          </ScrollView>
          <Button label={c.book.close} variant="quiet" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { width: "100%", maxWidth: 1120, alignSelf: "center", gap: space.xxl },
  stepHeader: { flexDirection: "row", alignItems: "center", gap: space.md },
  stepBadge: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  services: { gap: space.sm },
  servicesWide: { flexDirection: "row", flexWrap: "wrap" },
  serviceCard: { borderWidth: 1, borderRadius: radius.control, padding: space.md, gap: space.sm },
  serviceCardWide: { flexGrow: 1, flexBasis: 220, maxWidth: 280 },
  serviceTop: { flexDirection: "row", alignItems: "center", gap: space.sm },
  duration: { flexDirection: "row", alignItems: "center", gap: space.xs },
  detailsLink: { flexDirection: "row", alignItems: "center", gap: space.xs, minHeight: touch.min, alignSelf: "flex-start" },
  checkRow: {
    minHeight: touch.min,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: space.md,
  },
  box: { width: 24, height: 24, borderRadius: radius.edit, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  when: { gap: space.lg },
  whenWide: { flexDirection: "row", alignItems: "flex-start" },
  calendarCol: { flex: 1, maxWidth: 520 },
  timeCol: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.78)", justifyContent: "center", padding: space.lg },
  sheet: {
    maxHeight: "90%",
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    borderRadius: radius.panel,
    borderWidth: 1,
    padding: space.lg,
    gap: space.md,
  },
  sheetHeader: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  close: { minWidth: touch.min, minHeight: touch.min, alignItems: "center", justifyContent: "center" },
  bullet: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  priceRow: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
});
