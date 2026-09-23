import { AlertTriangle, CheckCircle2, Clock, Repeat } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { Button, Card, ChoiceChips, Field, palette, space, StatusBadge, Text } from "@/design";
import { bookingErrorMessage } from "@/features/booking/errors";
import { currentLocale, getCopy } from "@/i18n";
import { parseAmount } from "@/lib/price";
import { formatDateLong, formatTime } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import type { InventoryStatusItem } from "@/shared/database";
import { useAdjustStock, useCompleteTask, useInventory, useRecordPurchase, useRecordUsage, useTasks } from "./api";

type Mode = "use" | "purchase" | "adjust";
const qtyText = (n: number) => String(Number(n));
/** Conteo físico: acepta 0 (se acabó); el resto, como cualquier cantidad positiva. */
const parseCount = (text: string) => (text.trim() === "0" ? 0 : parseAmount(text));

/** Colaborador y propietario: tareas de mantenimiento e insumos. Compras y ajustes solo para el propietario. */
export function OperationsScreen({ owner }: { owner: boolean }) {
  const c = getCopy();
  const locale = currentLocale();
  const now = useNow();
  const tasks = useTasks();
  const inventory = useInventory();
  const complete = useCompleteTask();
  const fail = (e: unknown) => Alert.alert(bookingErrorMessage(e, c));

  return (
    <>
      <Card>
        <Text variant="eyebrow" tone="accent">
          {c.ops.tasks}
        </Text>
        {tasks.isLoading ? <ActivityIndicator color={palette.cyan} /> : null}
        {tasks.data && tasks.data.length === 0 ? <Text tone="muted">{c.ops.noTasks}</Text> : null}
        {(tasks.data ?? []).map((t) => {
          const overdue = t.status === "open" && new Date(t.due_at).getTime() < now;
          return (
            <View key={t.id} style={{ gap: space.xs }}>
              <Text variant="displaySm">{t.title}</Text>
              {t.notes ? <Text tone="muted">{t.notes}</Text> : null}
              <Text variant="bodySm" tone="muted">
                {`${c.ops.due(`${formatDateLong(t.due_at, locale)} ${formatTime(t.due_at, locale)}`)} · ${
                  t.assignee_name ? c.ops.assignedTo(t.assignee_name) : c.ops.anyone
                }`}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
                {overdue ? <StatusBadge label={c.ops.overdue} tone="danger" icon={Clock} /> : null}
                {t.recurrence ? <StatusBadge label={c.ops.recurrence[t.recurrence]} icon={Repeat} /> : null}
                {t.status === "done" ? <StatusBadge label={c.ops.doneToday} tone="success" icon={CheckCircle2} /> : null}
              </View>
              {t.status === "open" ? (
                <Button variant="ghost" label={c.ops.markDone} loading={complete.isPending} onPress={() => complete.mutate(t.id, { onError: fail })} />
              ) : null}
            </View>
          );
        })}
      </Card>

      <Card>
        <Text variant="eyebrow" tone="accent">
          {c.ops.supplies}
        </Text>
        {inventory.isLoading ? <ActivityIndicator color={palette.cyan} /> : null}
        {inventory.data && inventory.data.length === 0 ? <Text tone="muted">{c.ops.noSupplies}</Text> : null}
        {(inventory.data ?? []).map((item) => (
          <SupplyRow key={item.id} item={item} owner={owner} />
        ))}
      </Card>
    </>
  );
}

function SupplyRow({ item, owner }: { item: InventoryStatusItem; owner: boolean }) {
  const c = getCopy();
  const unit = c.ops.units[item.unit];
  const [mode, setMode] = useState<Mode | null>(null);
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState<"NIO" | "USD">("NIO");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();
  const use = useRecordUsage();
  const purchase = useRecordPurchase();
  const adjust = useAdjustStock();
  const busy = use.isPending || purchase.isPending || adjust.isPending;

  const modes: { value: Mode; label: string }[] = [
    { value: "use", label: c.ops.use },
    ...(owner ? [{ value: "purchase" as const, label: c.ops.purchase }, { value: "adjust" as const, label: c.ops.adjust }] : []),
  ];

  function reset(message: string) {
    setMode(null);
    setQty("");
    setCost("");
    setNote("");
    setError(undefined);
    Alert.alert(message);
  }
  const onError = (e: unknown) => Alert.alert(bookingErrorMessage(e, c));

  function submit() {
    const amount = mode === "adjust" ? parseCount(qty) : parseAmount(qty);
    const unitCost = cost.trim() ? parseCount(cost) : null;
    if (amount === null || (cost.trim() && unitCost === null)) {
      setError(c.ops.invalidNumber);
      return;
    }
    setError(undefined);
    if (mode === "use") use.mutate({ item: item.id, qty: amount }, { onSuccess: () => reset(c.ops.used), onError });
    if (mode === "purchase") {
      purchase.mutate(
        { item: item.id, qty: amount, unitCost, currency: unitCost === null ? null : currency },
        { onSuccess: () => reset(c.ops.purchased), onError },
      );
    }
    if (mode === "adjust") adjust.mutate({ item: item.id, counted: amount, note }, { onSuccess: () => reset(c.ops.adjusted), onError });
  }

  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label">{item.name}</Text>
      <Text tone="muted">
        {[c.ops.stock(qtyText(item.stock), unit), item.min_stock === null ? null : c.ops.min(qtyText(item.min_stock), unit)]
          .filter(Boolean)
          .join(" · ")}
      </Text>
      {item.low ? <StatusBadge label={c.ops.low} tone="warning" icon={AlertTriangle} /> : null}
      <ChoiceChips label={item.name} value={mode} onChange={setMode} options={modes} />
      {mode ? (
        <>
          <Field
            label={mode === "adjust" ? c.ops.counted(unit) : c.ops.quantity(unit)}
            value={qty}
            onChangeText={setQty}
            keyboardType="decimal-pad"
            error={error}
          />
          {mode === "purchase" ? (
            <>
              <Field label={c.ops.unitCost} value={cost} onChangeText={setCost} keyboardType="decimal-pad" />
              <ChoiceChips
                label={c.ops.currency}
                value={currency}
                onChange={setCurrency}
                options={[
                  { value: "NIO", label: "NIO" },
                  { value: "USD", label: "USD" },
                ]}
              />
            </>
          ) : null}
          {mode === "adjust" ? <Field label={c.ops.note} value={note} onChangeText={setNote} maxLength={200} /> : null}
          <Button label={modes.find((m) => m.value === mode)!.label} onPress={submit} loading={busy} />
        </>
      ) : null}
    </View>
  );
}
