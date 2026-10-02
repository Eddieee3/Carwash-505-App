import * as Crypto from "expo-crypto";
import { router } from "expo-router";
import { AlertTriangle, CheckCircle2, Clock, Plus, Repeat } from "lucide-react-native";
import { useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Alert } from "@/lib/alert";
import { Button, Card, ChoiceChips, EmptyState, Field, palette, space, StatusBadge, Text } from "@/design";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAssignableStaff } from "@/features/board/api";
import { bookingErrorMessage } from "@/features/booking/errors";
import { currentLocale, getCopy } from "@/i18n";
import { parseAmount } from "@/lib/price";
import { formatDateLong, formatTime, localDate, zonedToUtc } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import type { InventoryStatusItem, InventoryUnit, MaintenanceTask } from "@/shared/database";
import {
  useAdjustStock,
  useArchiveSupply,
  useCompleteTask,
  useCreateTask,
  useInventory,
  useReassignTask,
  useRecordPurchase,
  useRecordUsage,
  useSaveSupply,
  useTasks,
} from "./api";

type Mode = "use" | "purchase" | "adjust" | "edit";
const UNITS: InventoryUnit[] = ["unit", "ml", "l", "g", "kg"];
const qtyText = (n: number) => String(Number(n));
/** Conteo físico: acepta 0 (se acabó); el resto, como cualquier cantidad positiva. */
const parseCount = (text: string) => (text.trim() === "0" ? 0 : parseAmount(text));

/** Colaborador y propietario: tareas del equipo e insumos. Compras y ajustes solo para el propietario. */
export function OperationsScreen({ owner }: { owner: boolean }) {
  return (
    <>
      <TasksSection />
      <InventorySection owner={owner} />
    </>
  );
}

/**
 * O02: tareas del equipo. Cada persona ve las suyas y las sin responsable ("Mis tareas de hoy"); el dueño y el lobby
 * ven todas, las crean y las reasignan. Completar: el responsable (o el dueño).
 */
export function TasksSection() {
  const c = getCopy();
  const locale = currentLocale();
  const now = useNow();
  const { view } = useAuth();
  const frontDesk = view === "owner" || view === "lobby";
  const tasks = useTasks();
  const staff = useAssignableStaff(frontDesk);
  const complete = useCompleteTask();
  const reassign = useReassignTask();
  const [creating, setCreating] = useState(false);
  const fail = (e: unknown) => Alert.alert(bookingErrorMessage(e, c));

  const open = (tasks.data ?? []).filter((t) => t.status === "open");
  const done = (tasks.data ?? []).filter((t) => t.status === "done");

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm }}>
        <Text variant="eyebrow" tone="accent" accessibilityRole="header">
          {c.ops.tasksToday}
        </Text>
        {frontDesk && !creating ? <Button variant="quiet" label={c.ops.newTask} onPress={() => setCreating(true)} testID="task-new" /> : null}
      </View>
      {creating ? <NewTaskForm onDone={() => setCreating(false)} /> : null}
      {tasks.isLoading ? <ActivityIndicator color={palette.cyan} accessibilityLabel={c.common.loading} /> : null}
      {tasks.isError ? (
        <View style={{ gap: space.sm }}>
          <Text tone="danger">{bookingErrorMessage(tasks.error, c)}</Text>
          <Button variant="quiet" label={c.common.retry} onPress={() => tasks.refetch()} />
        </View>
      ) : null}
      {tasks.data && tasks.data.length === 0 ? <Text tone="muted">{c.ops.noTasks}</Text> : null}
      {[...open, ...done].map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          overdue={t.status === "open" && new Date(t.due_at).getTime() < now}
          locale={locale}
          staff={frontDesk ? (staff.data ?? []) : []}
          busy={complete.isPending || reassign.isPending}
          onComplete={() => complete.mutate(t.id, { onError: fail })}
          onReassign={(assigneeId) => reassign.mutate({ task: t.id, assigneeId }, { onError: fail })}
        />
      ))}
    </Card>
  );
}

function TaskRow({
  task: t,
  overdue,
  locale,
  staff,
  busy,
  onComplete,
  onReassign,
}: {
  task: MaintenanceTask;
  overdue: boolean;
  locale: "es" | "en";
  staff: { id: string; name: string }[];
  busy: boolean;
  onComplete: () => void;
  onReassign: (assigneeId: string) => void;
}) {
  const c = getCopy();
  return (
    <View style={{ gap: space.xs }}>
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
      {t.booking_id && t.booking_reference ? (
        <View style={{ alignSelf: "flex-start" }}>
          <Button variant="quiet" label={c.ops.linkedBooking(t.booking_reference)} onPress={() => router.push("/board")} />
        </View>
      ) : null}
      {t.status === "open" && staff.length > 0 ? (
        <ChoiceChips
          label={c.ops.reassign}
          value={t.assignee_id ?? ""}
          onChange={(id) => id !== t.assignee_id && onReassign(id)}
          options={staff.map((p) => ({ value: p.id, label: p.name }))}
        />
      ) : null}
      {t.status === "open" ? <Button variant="ghost" label={c.ops.markDone} loading={busy} onPress={onComplete} /> : null}
    </View>
  );
}

/** Nueva tarea (dueño o lobby): título, responsable y hora de hoy. */
function NewTaskForm({ onDone }: { onDone: () => void }) {
  const c = getCopy();
  const staff = useAssignableStaff(true);
  const create = useCreateTask();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [time, setTime] = useState("");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ title?: string; time?: string }>({});
  const attempt = useRef<string | null>(null);

  function submit() {
    const next: { title?: string; time?: string } = {};
    if (title.trim().length < 2) next.title = c.garage.required;
    const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
    if (!m) next.time = c.ops.invalidTime;
    setErrors(next);
    if (next.title || next.time || !m) return;
    attempt.current ??= Crypto.randomUUID();
    const dueAt = zonedToUtc(localDate(), `${m[1].padStart(2, "0")}:${m[2]}`).toISOString();
    create.mutate(
      { title: title.trim(), notes: notes.trim() || undefined, dueAt, assigneeId: assignee, requestId: attempt.current },
      {
        onSuccess: () => {
          attempt.current = null;
          onDone();
        },
        onError: (e) => Alert.alert(bookingErrorMessage(e, c)),
      },
    );
  }

  return (
    <View style={{ gap: space.sm }}>
      <Field label={c.ops.taskTitle} value={title} onChangeText={setTitle} error={errors.title} maxLength={120} />
      <Field label={c.ops.taskNotes} value={notes} onChangeText={setNotes} maxLength={500} multiline />
      <Field label={c.ops.taskTime} value={time} onChangeText={setTime} error={errors.time} placeholder="15:30" maxLength={5} hint={c.ops.taskTimeHint} />
      <ChoiceChips
        label={c.ops.reassign}
        value={assignee ?? ""}
        onChange={(id) => setAssignee(id === "" ? null : id)}
        options={[{ value: "", label: c.ops.anyone }, ...(staff.data ?? []).map((p) => ({ value: p.id, label: p.name }))]}
      />
      <Button label={c.ops.createTask} onPress={submit} loading={create.isPending} testID="task-create" />
      <Button variant="quiet" label={c.common.no} onPress={onDone} />
    </View>
  );
}

/** I01/I04: insumos con alertas de mínimo, filtro "bajo el mínimo" y, para el dueño, alta, edición y archivo. */
export function InventorySection({ owner }: { owner: boolean }) {
  const c = getCopy();
  const inventory = useInventory();
  const [filter, setFilter] = useState<"all" | "low">("all");
  const [adding, setAdding] = useState(false);
  const items = (inventory.data ?? []).filter((i) => filter === "all" || i.low);
  const lowCount = (inventory.data ?? []).filter((i) => i.low).length;

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm }}>
        <Text variant="eyebrow" tone="accent" accessibilityRole="header">
          {c.ops.supplies}
        </Text>
        {owner && !adding ? <Button variant="quiet" label={c.ops.newSupply} onPress={() => setAdding(true)} testID="supply-new" /> : null}
      </View>
      {adding ? <SupplyForm onDone={() => setAdding(false)} /> : null}
      <ChoiceChips
        label={c.ops.supplies}
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: c.ops.filterAll },
          { value: "low", label: c.ops.filterLow(lowCount) },
        ]}
      />
      {inventory.isLoading ? <ActivityIndicator color={palette.cyan} accessibilityLabel={c.common.loading} /> : null}
      {inventory.isError ? (
        <View style={{ gap: space.sm }}>
          <Text tone="danger">{bookingErrorMessage(inventory.error, c)}</Text>
          <Button variant="quiet" label={c.common.retry} onPress={() => inventory.refetch()} />
        </View>
      ) : null}
      {inventory.data && inventory.data.length === 0 ? (
        <EmptyState icon={Plus} title={c.ops.noSupplies} body={owner ? c.ops.noSuppliesOwner : undefined} />
      ) : null}
      {inventory.data && inventory.data.length > 0 && items.length === 0 ? <Text tone="muted">{c.ops.noneLow}</Text> : null}
      {items.map((item) => (
        <SupplyRow key={item.id} item={item} owner={owner} />
      ))}
    </Card>
  );
}

function SupplyForm({ item, onDone }: { item?: InventoryStatusItem; onDone: () => void }) {
  const c = getCopy();
  const save = useSaveSupply();
  const [name, setName] = useState(item?.name ?? "");
  const [unit, setUnit] = useState<InventoryUnit>(item?.unit ?? "unit");
  const [min, setMin] = useState(item?.min_stock === null || item?.min_stock === undefined ? "" : qtyText(item.min_stock));
  const [errors, setErrors] = useState<{ name?: string; min?: string }>({});

  function submit() {
    const minStock = min.trim() === "" ? null : parseCount(min);
    const next = { name: name.trim().length < 2 ? c.garage.required : undefined, min: min.trim() !== "" && minStock === null ? c.ops.invalidNumber : undefined };
    setErrors(next);
    if (next.name || next.min) return;
    save.mutate({ id: item?.id, name, unit, minStock }, { onSuccess: onDone, onError: (e) => Alert.alert(bookingErrorMessage(e, c)) });
  }

  return (
    <View style={{ gap: space.sm }}>
      <Field label={c.ops.supplyName} value={name} onChangeText={setName} error={errors.name} maxLength={80} />
      {/* La unidad no cambia después de crear el insumo: los movimientos ya registrados quedan en esa unidad. */}
      {!item ? (
        <ChoiceChips label={c.ops.unit} value={unit} onChange={setUnit} options={UNITS.map((u) => ({ value: u, label: c.ops.units[u] }))} />
      ) : null}
      <Field label={c.ops.minStock(c.ops.units[unit])} value={min} onChangeText={setMin} error={errors.min} keyboardType="decimal-pad" />
      <Button label={c.common.save} onPress={submit} loading={save.isPending} />
      <Button variant="quiet" label={c.common.no} onPress={onDone} />
    </View>
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
  const archive = useArchiveSupply();
  const attempt = useRef<string | null>(null);
  const busy = use.isPending || purchase.isPending || adjust.isPending;

  const modes: { value: Mode; label: string }[] = [
    { value: "use", label: c.ops.use },
    ...(owner
      ? [
          { value: "purchase" as const, label: c.ops.purchase },
          { value: "adjust" as const, label: c.ops.adjust },
          { value: "edit" as const, label: c.ops.edit },
        ]
      : []),
  ];

  function reset(message: string) {
    setMode(null);
    setQty("");
    setCost("");
    setNote("");
    setError(undefined);
    attempt.current = null;
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
    if (mode === "use") {
      attempt.current ??= Crypto.randomUUID();
      use.mutate({ item: item.id, qty: amount, requestId: attempt.current }, { onSuccess: () => reset(c.ops.used), onError });
    }
    if (mode === "purchase") {
      purchase.mutate(
        { item: item.id, qty: amount, unitCost, currency: unitCost === null ? null : currency },
        { onSuccess: () => reset(c.ops.purchased), onError },
      );
    }
    if (mode === "adjust") adjust.mutate({ item: item.id, counted: amount, note }, { onSuccess: () => reset(c.ops.adjusted), onError });
  }

  function askArchive() {
    Alert.alert(c.ops.archiveTitle(item.name), c.ops.archiveBody, [
      { text: c.common.no, style: "cancel" },
      { text: c.ops.archive, style: "destructive", onPress: () => archive.mutate(item.id, { onError }) },
    ]);
  }

  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label">{item.name}</Text>
      <Text tone="muted">
        {[c.ops.stock(qtyText(item.stock), unit), item.min_stock === null ? null : c.ops.min(qtyText(item.min_stock), unit)].filter(Boolean).join(" · ")}
      </Text>
      {item.low ? <StatusBadge label={c.ops.lowWith(qtyText(item.stock), unit)} tone="warning" icon={AlertTriangle} /> : null}
      <ChoiceChips label={item.name} value={mode} onChange={setMode} options={modes} />
      {mode === "edit" ? (
        <>
          <SupplyForm item={item} onDone={() => setMode(null)} />
          <Button variant="quiet" label={c.ops.archive} onPress={askArchive} />
        </>
      ) : mode ? (
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
