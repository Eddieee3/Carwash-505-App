import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";
import { Button, ChoiceChips, Field, Screen, space, Text } from "@/design";
import { bookingErrorMessage } from "@/features/booking/errors";
import { capturePhoto, type PhotoSource } from "@/features/evidence/api";
import { PhotoGallery } from "@/features/evidence/PhotoGallery";
import { useCreateTicket } from "@/features/support/api";
import { MAX_TICKET_PHOTOS, TICKET_KINDS, ticketSchema } from "@/features/support/schema";
import { getCopy } from "@/i18n";
import type { TicketKind } from "@/shared/database";

/** Reportar un problema o un daño que el vehículo ya tenía (con fotos opcionales). */
export default function NewTicket() {
  const c = getCopy();
  const { booking } = useLocalSearchParams<{ booking?: string }>();
  const create = useCreateTicket();
  const [kind, setKind] = useState<TicketKind>("pre_existing_damage");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string>();

  async function addPhoto(source: PhotoSource) {
    try {
      const uri = await capturePhoto(source);
      if (uri) setPhotos((p) => [...p, uri].slice(0, MAX_TICKET_PHOTOS));
    } catch (e) {
      Alert.alert(e instanceof Error && e.message === "permission_denied" ? c.photos.permission : c.errors.generic);
    }
  }

  function send() {
    const parsed = ticketSchema.safeParse({ kind, description, bookingId: booking ?? null });
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
