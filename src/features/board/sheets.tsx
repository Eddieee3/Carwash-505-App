import * as Crypto from "expo-crypto";
import { X } from "lucide-react-native";
import { useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Button, ChoiceChips, Field, palette, radius, space, StatusBadge, Text, touch, useTheme } from "@/design";
import { bookingErrorMessage } from "@/features/booking/errors";
import { currentLocale, getCopy } from "@/i18n";
import { formatPrice } from "@/lib/price";
import type { PaymentMethod } from "@/shared/database";
import { useBookingPayments, useRecordPayment, useSetFinalPrice } from "./api";

/** Hoja modal accesible: título, botón cerrar con nombre, desplazamiento y teclado (U02/U05). */
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const theme = useTheme();
  const c = getCopy();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.bgRaised, borderColor: theme.line }]} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text variant="displaySm" accessibilityRole="header" style={{ flex: 1 }}>
              {title}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel={c.book.close} onPress={onClose} hitSlop={10} style={styles.close}>
              <X size={22} color={theme.fg} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: space.md }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Pide un texto (motivo de cancelación, nota de daño…). `minLength` > 0 lo vuelve obligatorio.
 * Reemplaza a Alert.prompt, que solo existe en iOS.
 */
export function PromptSheet({
  visible,
  title,
  body,
  label,
  confirmLabel,
  minLength = 0,
  destructive = false,
  busy = false,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  body?: string;
  label: string;
  confirmLabel: string;
  minLength?: number;
  destructive?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (text: string) => void;
}) {
  const c = getCopy();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>();
  const close = () => {
    setText("");
    setError(undefined);
    onCancel();
  };
  return (
    <Sheet visible={visible} title={title} onClose={close}>
      {body ? <Text tone="muted">{body}</Text> : null}
      <Field label={label} value={text} onChangeText={setText} error={error} maxLength={200} multiline autoFocus />
      <Button
        label={confirmLabel}
        variant={destructive ? "ghost" : "primary"}
        loading={busy}
        onPress={() => {
          if (text.trim().length < minLength) {
            setError(c.staff.reasonRequired);
            return;
          }
          onConfirm(text.trim());
          setText("");
          setError(undefined);
        }}
      />
      <Button variant="quiet" label={c.common.no} onPress={close} />
    </Sheet>
  );
}

const METHODS: PaymentMethod[] = ["cash", "transfer", "card"];

/**
 * E01: cobro de una reserva en recepción. El monto y el saldo los calcula el servidor; un reintento con el mismo
 * intento no cobra dos veces. Lo que está por cotizar pide primero el precio final.
 */
export function PaymentSheet({ bookingId, title, onClose }: { bookingId: string | null; title: string; onClose: () => void }) {
  const c = getCopy();
  const locale = currentLocale();
  const summary = useBookingPayments(bookingId);
  const record = useRecordPayment();
  const setFinal = useSetFinalPrice();
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState("");
  const [finalPrice, setFinalPrice] = useState("");
  const [error, setError] = useState<string | undefined>();
  // Un id por intento: si la respuesta se pierde y se vuelve a tocar, el servidor reconoce el mismo cobro.
  const attempt = useRef<{ signature: string; id: string } | null>(null);

  const s = summary.data;
  const money = (n: number | null | undefined) => (n === null || n === undefined ? null : formatPrice(Number(n), s?.currency ?? "NIO", locale));
  const remaining = s && s.amount_due !== null ? Math.max(0, Number(s.amount_due) - Number(s.paid)) : null;

  function pay() {
    if (!bookingId) return;
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0 || (remaining !== null && value > remaining)) {
      setError(c.payments.invalidAmount);
      return;
    }
    setError(undefined);
    const signature = `${bookingId}|${value}|${method}`;
    if (attempt.current?.signature !== signature) attempt.current = { signature, id: Crypto.randomUUID() };
    record.mutate(
      { bookingId, amount: value, method, requestId: attempt.current.id },
      {
        onSuccess: () => {
          attempt.current = null;
          setAmount("");
        },
        onError: (e) => setError(bookingErrorMessage(e, c)),
      },
    );
  }

  function saveFinal() {
    if (!bookingId) return;
    const value = Number(finalPrice.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) {
      setError(c.payments.invalidAmount);
      return;
    }
    setFinal.mutate({ bookingId, amount: value }, { onSuccess: () => setFinalPrice(""), onError: (e) => setError(bookingErrorMessage(e, c)) });
  }

  return (
    <Sheet visible={!!bookingId} title={title} onClose={onClose}>
      {summary.isLoading ? (
        <ActivityIndicator color={palette.cyan} accessibilityLabel={c.common.loading} />
      ) : summary.isError || !s ? (
        <View style={{ gap: space.sm }}>
          <Text tone="danger">{bookingErrorMessage(summary.error, c)}</Text>
          <Button variant="quiet" label={c.common.retry} onPress={() => summary.refetch()} />
        </View>
      ) : (
        <>
          <StatusBadge label={c.payments.status[s.status]} tone={s.status === "paid" ? "success" : s.status === "partial" ? "warning" : "info"} />
          <Row label={c.payments.due} value={money(s.amount_due) ?? c.pricing.toQuote} />
          <Row label={c.payments.paid} value={money(s.paid) ?? "0"} />
          {remaining !== null ? <Row label={c.payments.remaining} value={money(remaining) ?? "0"} strong /> : null}

          {(s.payments ?? []).map((p) => (
            <Text key={p.id} variant="bodySm" tone={p.status === "void" ? "muted" : "fg"} style={p.status === "void" ? { textDecorationLine: "line-through" } : undefined}>
              {`${money(p.amount)} · ${c.payments.methods[p.method]}${p.status === "void" ? ` · ${c.payments.voided}${p.void_reason ? `: ${p.void_reason}` : ""}` : ""}`}
            </Text>
          ))}

          {s.status === "pending_quote" ? (
            <View style={{ gap: space.sm }}>
              <Text tone="muted">{c.payments.quoteFirst}</Text>
              <Field label={c.payments.finalPrice} value={finalPrice} onChangeText={setFinalPrice} keyboardType="decimal-pad" maxLength={10} />
              <Button label={c.payments.saveFinal} onPress={saveFinal} loading={setFinal.isPending} />
            </View>
          ) : s.status !== "paid" ? (
            <View style={{ gap: space.sm }}>
              <ChoiceChips
                label={c.payments.method}
                value={method}
                onChange={setMethod}
                options={METHODS.map((m) => ({ value: m, label: c.payments.methods[m] }))}
              />
              <Field
                label={c.payments.amount}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                maxLength={10}
                placeholder={remaining !== null ? String(remaining) : undefined}
              />
              {remaining !== null ? (
                <Button variant="quiet" label={c.payments.fillRemaining(money(remaining) ?? "")} onPress={() => setAmount(String(remaining))} />
              ) : null}
              <Button label={c.payments.record} onPress={pay} loading={record.isPending} disabled={record.isPending} testID="payment-record" />
            </View>
          ) : null}
          {error ? (
            <Text tone="danger" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
        </>
      )}
    </Sheet>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text tone="muted">{label}</Text>
      <Text variant={strong ? "label" : "body"}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: space.lg },
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
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  close: { minWidth: touch.min, minHeight: touch.min, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
});
