import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Switch, View } from "react-native";
import { Button, ChoiceChips, Field, palette, Screen, space, Text } from "@/design";
import { useArchiveVehicle, useSaveVehicle, useVehicles } from "@/features/garage/api";
import { emptyVehicleForm, VEHICLE_KINDS, vehicleSchema, vehicleToForm, type VehicleForm } from "@/features/garage/vehicle";
import { bookingErrorMessage } from "@/features/booking/errors";
import { getCopy } from "@/i18n";

type Errors = Partial<Record<keyof VehicleForm, string>>;

export default function VehicleEditor() {
  const c = getCopy();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === "new";
  const vehicles = useVehicles();
  const existing = (vehicles.data ?? []).find((v) => v.id === id) ?? null;
  const save = useSaveVehicle();
  const archive = useArchiveVehicle();

  const [draft, setDraft] = useState<VehicleForm | null>(null);
  const [errors, setErrors] = useState<Errors>({});

  if (vehicles.isLoading) {
    return (
      <Screen edges={["bottom"]}>
        <ActivityIndicator color={palette.cyan} />
      </Screen>
    );
  }

  const form = draft ?? (existing ? vehicleToForm(existing) : emptyVehicleForm());
  const set = <K extends keyof VehicleForm>(key: K, value: VehicleForm[K]) => setDraft({ ...form, [key]: value });

  function submit() {
    const parsed = vehicleSchema.safeParse(form);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof VehicleForm;
        next[key] = issue.message === "invalid_year" ? c.garage.invalidYear : c.garage.tooLong;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    save.mutate(
      { id: isNew ? undefined : id, input: parsed.data, isFirst: (vehicles.data ?? []).length === 0 },
      { onSuccess: () => router.back(), onError: (e) => Alert.alert(bookingErrorMessage(e, c)) },
    );
  }

  function remove() {
    Alert.alert(c.garage.archiveTitle, c.garage.archiveBody, [
      { text: c.common.no, style: "cancel" },
      {
        text: c.garage.archive,
        style: "destructive",
        onPress: () => archive.mutate(id, { onSuccess: () => router.back(), onError: (e) => Alert.alert(bookingErrorMessage(e, c)) }),
      },
    ]);
  }

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen options={{ title: isNew ? c.garage.newTitle : c.garage.editTitle }} />

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
        onChangeText={(v) => set("year", v)}
        error={errors.year}
        keyboardType="number-pad"
        maxLength={4}
      />
      <Field label={c.garage.color} value={form.color} onChangeText={(v) => set("color", v)} error={errors.color} maxLength={30} />
      <Field
        label={c.garage.plate}
        value={form.plate}
        onChangeText={(v) => set("plate", v)}
        error={errors.plate}
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

      <Button label={c.common.save} onPress={submit} loading={save.isPending} testID="vehicle-save" />
      {!isNew && existing ? <Button variant="quiet" label={c.garage.archive} onPress={remove} /> : null}
    </Screen>
  );
}
