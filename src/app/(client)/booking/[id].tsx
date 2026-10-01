import * as Linking from "expo-linking";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Clock } from "lucide-react-native";
import { ActivityIndicator, Alert, View } from "react-native";
import { Button, Card, ChoiceChips, EmptyState, Eyebrow, palette, Screen, space, StatusBadge, Text } from "@/design";
import { useBooking, useCancelBooking, useDirections, useEstimate, useReplyAttendance, useSetEta } from "@/features/booking/api";
import { bookingErrorMessage } from "@/features/booking/errors";
import { SpinCard } from "@/features/commerce/SpinCard";
import { STATUS_STYLE } from "@/features/booking/status";
import { ServiceProgress } from "@/features/booking/BookingCard";
import { useBookingMedia } from "@/features/evidence/api";
import { PhotoGallery } from "@/features/evidence/PhotoGallery";
import { vehicleLabel } from "@/features/garage/vehicle";
import { ReviewCard } from "@/features/loyalty/ReviewCard";
import { PriceBreakdown } from "@/features/pricing/PriceBreakdown";
import { currentLocale, getCopy } from "@/i18n";
import { formatPrice } from "@/lib/price";
import { formatDateLong, formatTime, rangeEnd } from "@/lib/time";
import { useNow } from "@/lib/use-now";

const ETA_OPTIONS = [5, 10, 20] as const;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <Text>{value}</Text>
    </View>
  );
}

export default function BookingDetail() {
  const c = getCopy();
  const locale = currentLocale();
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();
  const booking = useBooking(id);
  const cancel = useCancelBooking();
  const reply = useReplyAttendance();
  const eta = useSetEta();
  const directions = useDirections();
  const media = useBookingMedia(id);
  const now = useNow();
  const estimate = useEstimate(id, booking.data?.status === "in_progress");

  if (booking.isLoading) {
    return (
      <Screen edges={["bottom"]}>
        <ActivityIndicator color={palette.cyan} />
      </Screen>
    );
  }
  const b = booking.data;
  if (!b) {
    return (
      <Screen edges={["bottom"]}>
        <Stack.Screen options={{ title: c.booking.title }} />
        <EmptyState title={c.booking.notFound} />
      </Screen>
    );
  }

  const fail = (e: unknown) => Alert.alert(bookingErrorMessage(e, c));
  const snap = b.price_snapshot;
  const end = rangeEnd(b.slot);
  const when = `${formatDateLong(b.starts_at, locale)} · ${formatTime(b.starts_at, locale)}${end ? ` – ${formatTime(end, locale)}` : ""}`;
  const price = formatPrice(snap.amount, snap.currency, locale) ?? c.book.priceToConfirm;
  const style = STATUS_STYLE[b.status];
  const upcoming = b.status === "confirmed";
  const canCancel = upcoming && new Date(b.starts_at).getTime() > now;
  const hasDirections = !!(directions.data?.waze_url || directions.data?.google_maps_url);

  function askCancel() {
    Alert.alert(c.booking.cancelTitle, c.booking.cancelBody, [
      { text: c.booking.keep, style: "cancel" },
      {
        text: c.booking.cancel,
        style: "destructive",
        onPress: () =>
          cancel.mutate(id, {
            onSuccess: () => {
              Alert.alert(c.booking.cancelled);
              router.back();
            },
            onError: fail,
          }),
      },
    ]);
  }

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen options={{ title: c.booking.title }} />
      {created ? <Eyebrow>{c.book.confirmed}</Eyebrow> : null}
      <Card>
        <StatusBadge label={c.status[b.status]} tone={style.tone} icon={style.icon} />
        <Text variant="displayMd">{locale === "en" ? snap.service_name_en : snap.service_name_es}</Text>
        <Row label={c.booking.when} value={when} />
        {b.vehicle ? (
          <Row label={c.booking.vehicle} value={[vehicleLabel(b.vehicle, c), b.vehicle.plate].filter(Boolean).join(" · ")} />
        ) : null}
        {snap.adjustments || snap.services ? (
          // Reservas desde la F5: desglose guardado al reservar (no se recalcula).
          <View style={{ gap: 2 }}>
            <Text variant="label" tone="muted">
              {c.booking.price}
            </Text>
            <PriceBreakdown snapshot={snap} />
          </View>
        ) : (
          <Row label={c.booking.price} value={price} />
        )}
        <Row label={c.booking.reference} value={b.reference_code} />
      </Card>

      {b.status !== "cancelled" && b.status !== "no_show" ? (
        <Card>
          <Text variant="eyebrow" tone="accent" accessibilityRole="header">
            {c.booking.progressTitle}
          </Text>
          <ServiceProgress status={b.status} />
          {b.status === "in_progress" ? (
            <StatusBadge
              label={estimate.data ? c.arrival.estimate(formatTime(estimate.data, locale)) : c.arrival.inProgress}
              tone="warning"
              icon={Clock}
            />
          ) : null}
          {b.status === "ready" ? <Text accessibilityLiveRegion="polite">{c.booking.readyPickUp}</Text> : null}
        </Card>
      ) : null}

      {upcoming ? (
        <Card>
          <Text variant="eyebrow" tone="accent">
            {c.arrival.question}
          </Text>
          {b.attendance ? <Text>{c.arrival.replied[b.attendance]}</Text> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            <Button
              label={c.arrival.attending}
              variant={b.attendance === "attending" ? "ghost" : "primary"}
              onPress={() => reply.mutate({ id, reply: "attending" }, { onError: fail })}
              disabled={reply.isPending}
              testID="attendance-attending"
            />
            <Button
              label={c.arrival.late}
              variant="ghost"
              onPress={() => reply.mutate({ id, reply: "late" }, { onError: fail })}
              disabled={reply.isPending}
            />
          </View>

          <Text variant="eyebrow" tone="accent">
            {c.arrival.etaTitle}
          </Text>
          {b.eta_at ? <Text>{c.arrival.etaSent(formatTime(b.eta_at, locale))}</Text> : null}
          <ChoiceChips
            label={c.arrival.etaTitle}
            value={null}
            onChange={(m) => eta.mutate({ id, minutes: Number(m) }, { onError: fail })}
            options={ETA_OPTIONS.map((m) => ({ value: String(m), label: c.arrival.etaIn(m) }))}
            testIDPrefix="eta"
          />
        </Card>
      ) : null}

      {upcoming && hasDirections ? (
        <Card>
          <Text variant="eyebrow" tone="accent">
            {c.arrival.directions}
          </Text>
          {directions.data?.waze_url ? (
            <Button variant="ghost" label={c.arrival.waze} onPress={() => Linking.openURL(directions.data!.waze_url!)} />
          ) : null}
          {directions.data?.google_maps_url ? (
            <Button variant="ghost" label={c.arrival.maps} onPress={() => Linking.openURL(directions.data!.google_maps_url!)} />
          ) : null}
        </Card>
      ) : null}

      {b.status !== "confirmed" && b.status !== "cancelled" ? (
        <Card>
          <Text variant="eyebrow" tone="accent">
            {c.photos.title}
          </Text>
          <PhotoGallery
            photos={(media.data ?? []).map((p) => ({ id: p.id, url: p.url, label: c.photos.phases[p.phase] }))}
            emptyText={media.isLoading ? undefined : c.photos.none}
          />
        </Card>
      ) : null}

      {b.status === "completed" ? (
        <>
          <ReviewCard bookingId={id} />
          <SpinCard bookingId={id} />
        </>
      ) : null}

      <View style={{ gap: space.sm }}>
        <Button
          variant="quiet"
          label={c.support.report}
          onPress={() => router.push({ pathname: "/support/new", params: { booking: id } })}
        />
        {canCancel ? <Button variant="ghost" label={c.booking.cancel} onPress={askCancel} loading={cancel.isPending} /> : null}
      </View>
    </Screen>
  );
}
