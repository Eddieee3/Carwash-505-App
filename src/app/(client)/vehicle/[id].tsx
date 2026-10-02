import * as Crypto from "expo-crypto";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { CalendarClock, Camera, CarFront, ImagePlus } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from "react-native";
import { Alert } from "@/lib/alert";
import { Button, Card, ChoiceChips, Field, palette, radius, Screen, space, Text, touch, useTheme } from "@/design";
import { useMyBookings } from "@/features/booking/api";
import { bookingErrorCode, bookingErrorMessage } from "@/features/booking/errors";
import { capturePhoto, type PhotoSource } from "@/features/evidence/api";
import { useArchiveVehicle, useSaveVehicle, useSetVehiclePhoto, useVehiclePhotoUrls, useVehicles } from "@/features/garage/api";
import {
  emptyVehicleForm,
  maxVehicleYear,
  VEHICLE_KINDS,
  vehicleLabel,
  vehicleSchema,
  vehicleToForm,
  type VehicleForm,
} from "@/features/garage/vehicle";
import { currentLocale, getCopy } from "@/i18n";
import { formatDateLong, formatTime } from "@/lib/time";

type Errors = Partial<Record<keyof VehicleForm, string>>;

/** Ficha del vehículo (V01/V02/V04): datos, foto, principal, historial y próxima cita. */
export default function VehicleEditor() {
  const c = getCopy();
  const locale = currentLocale();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const vehicles = useVehicles();
  const existing = (vehicles.data ?? []).find((v) => v.id === id) ?? null;
  const photoUrls = useVehiclePhotoUrls(existing ? [existing] : []);
  const bookings = useMyBookings();
  const save = useSaveVehicle();
  const archive = useArchiveVehicle();
  const setPhoto = useSetVehiclePhoto();

  const [draft, setDraft] = useState<VehicleForm | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  // Foto elegida antes de crear el vehículo: se sube al guardar.
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  if (vehicles.isLoading) {
    return (
      <Screen edges={["bottom"]}>
        <ActivityIndicator color={palette.cyan} accessibilityLabel={c.common.loading} />
      </Screen>
    );
  }

  const form = draft ?? (existing ? vehicleToForm(existing) : emptyVehicleForm());
  const set = <K extends keyof VehicleForm>(key: K, value: VehicleForm[K]) => {
    setDraft({ ...form, [key]: value });
    if (errors[key]) setErrors({ ...errors, [key]: undefined });
  };
  const nextVisit = existing ? (bookings.data ?? []).find((b) => b.vehicle_id === existing.id) : undefined;
  const photoUri = pendingPhoto ?? (existing?.photo_path ? photoUrls.data?.[existing.photo_path] : undefined);
  const label = existing ? vehicleLabel(existing, c) : c.garage.newTitle;

  const message = (issue: string) =>
    issue === "invalid_year"
      ? c.garage.invalidYear(maxVehicleYear())
      : issue === "invalid_plate"
        ? c.garage.invalidPlate
        : issue === "required"
          ? c.garage.required
          : c.garage.tooLong;

  async function pick(source: PhotoSource) {
    setPicking(true);
    try {
      const uri = await capturePhoto(source);
      if (!uri) return;
      if (!existing) {
        setPendingPhoto(uri);
        return;
      }
      setPhoto.mutate({ vehicle: existing, uri, fileId: Crypto.randomUUID() }, { onError: (e) => Alert.alert(bookingErrorMessage(e, c)) });
    } catch (e) {
      Alert.alert(bookingErrorMessage(e, c));
    } finally {
      setPicking(false);
    }
  }

  function submit() {
    const parsed = vehicleSchema.safeParse(form);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof VehicleForm] = message(issue.message);
      setErrors(next);
      return;
    }
    setErrors({});
    save.mutate(
      { id: isNew ? undefined : id, input: parsed.data, isFirst: (vehicles.data ?? []).length === 0 },
      {
        onSuccess: (vehicleId) => {
          if (pendingPhoto) {
            // La ficha ya existe: si la foto falla, se avisa y se puede reintentar desde la ficha sin perder los datos.
            setPhoto.mutate(
              { vehicle: { id: vehicleId, photo_path: null }, uri: pendingPhoto, fileId: Crypto.randomUUID() },
              { onSettled: () => router.back(), onError: (e) => Alert.alert(bookingErrorMessage(e, c)) },
            );
          } else {
            router.back();
          }
        },
        onError: (e) => {
          const code = bookingErrorCode(e);
          if (code === "vehicles_plate_format" || code === "vehicles_plate_unique") setErrors({ plate: c.errors[code] });
          else if (code === "year_invalid") setErrors({ year: c.errors.year_invalid });
          else Alert.alert(bookingErrorMessage(e, c));
        },
      },
    );
  }

  function remove() {
    if (nextVisit) {
      Alert.alert(c.garage.archiveBlocked);
      return;
    }
    Alert.alert(c.garage.archiveTitle, c.garage.archiveBody, [
      { text: c.common.no, style: "cancel" },
      {
        text: c.garage.archive,
        style: "destructive",
        onPress: () => archive.mutate(id, { onSuccess: () => router.back(), onError: (e) => Alert.alert(bookingErrorMessage(e, c)) }),
      },
    ]);
  }

  const uploading = setPhoto.isPending || picking;

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen options={{ title: isNew ? c.garage.newTitle : c.garage.editTitle }} />

      <View style={{ gap: space.sm }}>
        <Text variant="label">{c.garage.photo}</Text>
        <View style={[styles.photo, { borderColor: theme.line, backgroundColor: theme.bgRaised }]}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={c.garage.photoAlt(label)} />
          ) : (
            <CarFront size={56} color={theme.fgMuted} accessibilityLabel={c.garage.photoAlt(label)} />
          )}
          {uploading ? (
            <View style={styles.photoOverlay}>
              <ActivityIndicator color={palette.ice} />
              <Text variant="bodySm" style={{ color: palette.ice }}>
                {c.garage.uploading}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.photoActions}>
          <PhotoButton icon={Camera} label={c.garage.takePhoto} onPress={() => pick("camera")} disabled={uploading} />
          <PhotoButton
            icon={ImagePlus}
            label={photoUri ? c.garage.changePhoto : c.garage.choosePhoto}
            onPress={() => pick("library")}
            disabled={uploading}
          />
        </View>
        {pendingPhoto ? (
          <Text variant="bodySm" tone="muted">
            {c.garage.photoPending}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="label">{c.garage.kind}</Text>
        <ChoiceChips
          label={c.garage.kind}
          value={form.kind}
          onChange={(k) => set("kind", k)}
          options={VEHICLE_KINDS.map((k) => ({ value: k, label: c.garage.kinds[k] }))}
          testIDPrefix="vehicle-kind"
        />
      </View>
      <Field label={c.garage.make} value={form.make} onChangeText={(v) => set("make", v)} error={errors.make} maxLength={40} />
      <Field label={c.garage.model} value={form.model} onChangeText={(v) => set("model", v)} error={errors.model} maxLength={40} />
      <Field
        label={c.garage.year}
        value={form.year}
        onChangeText={(v) => set("year", v.replace(/\D/g, ""))}
        error={errors.year}
        keyboardType="number-pad"
        maxLength={4}
      />
      <Field label={c.garage.color} value={form.color} onChangeText={(v) => set("color", v)} error={errors.color} maxLength={30} />
      <Field
        label={c.garage.plate}
        value={form.plate}
        onChangeText={(v) => set("plate", v.toUpperCase())}
        error={errors.plate}
        hint={c.garage.plateHint}
        autoCapitalize="characters"
        maxLength={15}
        testID="vehicle-plate"
      />
      <Field label={c.garage.nickname} value={form.nickname} onChangeText={(v) => set("nickname", v)} error={errors.nickname} maxLength={40} />

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md }}>
        <Text style={{ flex: 1 }}>{c.garage.makeDefault}</Text>
        <Switch
          accessibilityLabel={c.garage.makeDefault}
          value={form.is_default}
          onValueChange={(v) => set("is_default", v)}
          trackColor={{ true: palette.brand, false: palette.surface }}
          thumbColor={palette.ice}
        />
      </View>

      <Button label={c.common.save} onPress={submit} loading={save.isPending} disabled={uploading} testID="vehicle-save" />

      {existing ? (
        <Card>
          <View style={styles.row}>
            <CalendarClock size={18} color={palette.cyan} />
            <Text style={{ flex: 1 }}>
              {nextVisit
                ? c.garage.nextVisit(`${formatDateLong(nextVisit.starts_at, locale)} · ${formatTime(nextVisit.starts_at, locale)}`)
                : c.garage.noNextVisit}
            </Text>
          </View>
          {nextVisit ? (
            <Button variant="quiet" label={c.garage.viewBooking} onPress={() => router.push(`/booking/${nextVisit.id}`)} />
          ) : (
            <Button
              variant="quiet"
              label={c.garage.bookWith}
              onPress={() => router.push({ pathname: "/book", params: { vehicle: existing.id } })}
            />
          )}
          <Button
            variant="quiet"
            label={c.garage.history}
            onPress={() => router.push({ pathname: "/history", params: { vehicle: existing.id } })}
          />
        </Card>
      ) : null}

      {!isNew && existing ? <Button variant="quiet" label={c.garage.archive} onPress={remove} /> : null}
    </Screen>
  );
}

function PhotoButton({ icon: Icon, label, onPress, disabled }: { icon: typeof Camera; label: string; onPress: () => void; disabled: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[styles.photoButton, { borderColor: theme.lineStrong, opacity: disabled ? 0.5 : 1 }]}
    >
      <Icon size={18} color={theme.accent} />
      <Text variant="label">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  photo: {
    height: 180,
    borderRadius: radius.panel,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  photoOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(5,7,10,0.6)",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
  },
  photoActions: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  photoButton: {
    flexGrow: 1,
    minHeight: touch.min,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
});
