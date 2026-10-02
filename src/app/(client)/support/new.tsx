import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Alert } from "@/lib/alert";
import { Button, ChoiceChips, Field, Screen, space, Text } from "@/design";
import { useBookingHistory, useMyBookings } from "@/features/booking/api";
import { bookingErrorMessage } from "@/features/booking/errors";
import { capturePhoto, type PhotoSource } from "@/features/evidence/api";
import { PhotoGallery } from "@/features/evidence/PhotoGallery";
import { useCreateTicket } from "@/features/support/api";
import { MAX_TICKET_PHOTOS, TICKET_KINDS, ticketSchema } from "@/features/support/schema";
import { currentLocale, getCopy } from "@/i18n";
import { formatDateLong } from "@/lib/time";
import type { TicketKind } from "@/shared/database";

/** Reportar un problema o un daño que el vehículo ya tenía (con fotos opcionales), ligado a una reserva propia (S02). */
export default function NewTicket() {
  const c = getCopy();
  const locale = currentLocale();
  const { booking } = useLocalSearchParams<{ booking?: string }>();
  const create = useCreateTicket();
  const upcoming = useMyBookings();
  const past = useBookingHistory();
  // Solo reservas propias (RLS); el servidor además rechaza vincular una ajena.
  const own = [...(upcoming.data ?? []), ...(past.data ?? [])].slice(0, 12);
  const [bookingId, setBookingId] = useState<string>(booking ?? "");
  const [kind, setKind] = useState<TicketKind>("pre_existing_damage");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string>();

  async function addPhoto(source: PhotoSource) {
    try {
      const uri = await capturePhoto(source);
      if (uri) setPhotos((p) => [...p, uri].slice(0, MAX_TICKET_PHOTOS));
    } catch (e) {
      Alert.alert(e instanceof Error && e.message === "permission_denied" ? c.photos.permission : bookingErrorMessage(e, c));
    }
  }

  function send() {
    const parsed = ticketSchema.safeParse({ kind, description, bookingId: bookingId || null });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message === "too_long" ? c.support.tooLong : c.support.tooShort);
      return;
    }
    setError(undefined);
    create.mutate(
      { input: parsed.data, photos },
      {
        onSuccess: () => {
          Alert.alert(c.support.sent);
          router.replace("/support");
        },
        onError: (e) => Alert.alert(bookingErrorMessage(e, c)),
      },
    );
  }

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen options={{ title: c.support.newTitle }} />
      <View style={{ gap: space.sm }}>
        <Text variant="label">{c.support.kind}</Text>
        <ChoiceChips
          label={c.support.kind}
          layout="column"
          value={kind}
          onChange={setKind}
          options={TICKET_KINDS.map((k) => ({ value: k, label: c.support.kinds[k] }))}
        />
      </View>
      {own.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <Text variant="label">{c.support.relatedBooking}</Text>
          <ChoiceChips
            label={c.support.relatedBooking}
            layout="column"
            value={bookingId}
            onChange={setBookingId}
            options={[
              { value: "", label: c.support.noBooking },
              ...own.map((b) => ({
                value: b.id,
                label: locale === "en" ? b.price_snapshot.service_name_en : b.price_snapshot.service_name_es,
                sublabel: `${formatDateLong(b.starts_at, locale)} · ${b.reference_code}`,
              })),
            ]}
          />
        </View>
      ) : null}
      <Field
        label={c.support.description}
        value={description}
        onChangeText={setDescription}
        error={error}
        multiline
        maxLength={2000}
        style={{ minHeight: 120, textAlignVertical: "top", paddingTop: space.md }}
        testID="ticket-description"
      />
      <View style={{ gap: space.sm }}>
        <Text variant="label">{c.support.photos(photos.length, MAX_TICKET_PHOTOS)}</Text>
        <PhotoGallery photos={photos.map((uri, i) => ({ id: `${i}`, url: uri }))} />
        {photos.length < MAX_TICKET_PHOTOS ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            <Button variant="ghost" label={c.support.addCamera} onPress={() => addPhoto("camera")} />
            <Button variant="quiet" label={c.support.addLibrary} onPress={() => addPhoto("library")} />
          </View>
        ) : null}
      </View>
      <Button label={c.support.send} onPress={send} loading={create.isPending} testID="ticket-send" />
    </Screen>
  );
}
