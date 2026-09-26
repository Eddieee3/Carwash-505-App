import { CameraView, useCameraPermissions } from "expo-camera";
import { Stack } from "expo-router";
import { CreditCard, Crown, Receipt } from "lucide-react-native";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button, Card, ChoiceChips, EmptyState, Field, fonts, palette, radius, Screen, space, StatusBadge, Text } from "@/design";
import { useBoardAction } from "@/features/board/api";
import { bookingErrorMessage } from "@/features/booking/errors";
import { STATUS_STYLE } from "@/features/booking/status";
import { useConfirmPayment, useRedeemGiftCard } from "@/features/commerce/api";
import { useMarkRedemptionUsed, useStaffComplete, useStaffScan, useStaffWalkIn } from "@/features/loyalty/api";
import { VipCardView } from "@/features/loyalty/VipCard";
import { currentLocale, getCopy } from "@/i18n";
import { formatPrice, parseAmount } from "@/lib/price";
import { formatDateLong, formatTime } from "@/lib/time";
import type { StaffScan, StaffWashResult } from "@/shared/database";

/**
 * Personal: escanear la Tarjeta VIP (QR de la app, de Apple Wallet o de Google Wallet) → cliente, tarjeta VIP,
 * membresía, puntos, reservas de hoy (check-in y "Lavado completado"), lavado sin cita, canjes por usar,
 * cobro con gift card y confirmación de pagos hechos en el local.
 * Cada escaneo sirve para registrar UN lavado (la BD lo garantiza); el pase del teléfono se actualiza al instante.
 */
export default function Scan() {
  const c = getCopy();
  const locale = currentLocale();
  const [permission, requestPermission] = useCameraPermissions();
  const scan = useStaffScan();
  const complete = useStaffComplete();
  const walkIn = useStaffWalkIn();
  const markUsed = useMarkRedemptionUsed();
  const action = useBoardAction();
  const confirmPayment = useConfirmPayment();
  const redeemCard = useRedeemGiftCard();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [result, setResult] = useState<StaffScan | null>(null);
  const [used, setUsed] = useState(false);
  const [walkService, setWalkService] = useState<string | null>(null);
  const [walkVehicle, setWalkVehicle] = useState<string>("kind:car");
  const fail = (e: unknown) => Alert.alert(bookingErrorMessage(e, c));
  const money = (n: number, cur: string) => formatPrice(n, cur, locale) ?? String(n);

  function onScanned(data: string) {
    if (scan.isPending || result) return;
    if (!data.startsWith("cw505:")) {
      Alert.alert(c.scan.invalid);
      return;
    }
    scan.mutate(data, {
      onSuccess: (r) => ("error" in r ? Alert.alert(c.scan.codeErrors[r.error]) : setResult(r)),
      onError: fail,
    });
  }

  function onWashDone(r: StaffWashResult) {
    if (!result) return;
    setUsed(true);
    setResult({
      ...result,
      vip_card: r.vip_card,
      bookings: result.bookings.map((b) => (b.id === r.booking_id ? { ...b, status: "completed" } : b)),
    });
    const wallet = r.wallet.updated === 0 ? undefined : r.wallet.error ? c.scan.walletPending : c.scan.walletUpdated;
    Alert.alert(c.scan.stamped(r.vip_card.filled, r.vip_card.card_slots), wallet);
  }

  function reset() {
    setResult(null);
    setUsed(false);
    setAmounts({});
    setWalkService(null);
    setWalkVehicle("kind:car");
  }

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: c.scan.title,
          headerStyle: { backgroundColor: palette.ink },
          headerTintColor: palette.ice,
          headerTitleStyle: { fontFamily: fonts.display.semibold },
        }}
      />

      {!permission ? null : !permission.granted ? (
        <EmptyState title={c.scan.permission} action={{ label: c.scan.allow, onPress: requestPermission }} />
      ) : !result ? (
        <View style={styles.cameraBox}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => onScanned(data)}
          />
        </View>
      ) : (
        <>
          <Card>
            <Text variant="displayMd">{result.name ?? c.staff.customer}</Text>
            {result.vip_since ? <StatusBadge label={c.wallet.vip} tone="warning" icon={Crown} /> : null}
            <Text tone="muted">{c.scan.points(result.balance)}</Text>
            {result.membership ? (
              <Text tone="muted">{`${c.scan.membership}: ${locale === "en" ? result.membership.name_en : result.membership.name_es} · ${c.commerce.activeUntil(formatDateLong(result.membership.ends_at, locale))}`}</Text>
            ) : null}
          </Card>

          {result.vip_card.enabled ? <VipCardView card={result.vip_card} /> : null}
          {used ? (
            <Text tone="muted" testID="scan-used">
              {c.scan.sessionUsed}
            </Text>
          ) : null}

          {result.orders.length > 0 ? (
            <Card>
              <Text variant="eyebrow" tone="accent">
                {c.scan.orders}
              </Text>
              {result.orders.map((o) => {
                const total = money(Number(o.amount), o.currency);
                return (
                  <View key={o.id} style={{ gap: space.xs }}>
                    <StatusBadge label={o.code} icon={Receipt} />
                    <Text>{`${o.kind === "membership" ? c.commerce.orderMembership(o.plan_code ?? "") : c.commerce.orderGiftCard} · ${total}`}</Text>
                    <Button
                      label={c.scan.confirmPayment}
                      loading={confirmPayment.isPending}
                      onPress={() =>
                        Alert.alert(c.scan.confirmPayment, c.scan.confirmPaymentBody(o.code, total), [
                          { text: c.common.no, style: "cancel" },
                          {
                            text: c.common.yes,
                            onPress: () =>
                              confirmPayment.mutate(o.id, {
                                onSuccess: () => {
                                  Alert.alert(c.scan.paymentConfirmed);
                                  setResult({ ...result, orders: result.orders.filter((x) => x.id !== o.id) });
                                },
                                onError: fail,
                              }),
                          },
                        ])
                      }
                    />
                  </View>
                );
              })}
            </Card>
          ) : null}

          <Card>
            <Text variant="eyebrow" tone="accent">
              {c.scan.today}
            </Text>
            {result.bookings.length === 0 ? <Text tone="muted">{c.scan.noBookings}</Text> : null}
            {result.bookings.map((b) => (
              <View key={b.id} style={{ gap: space.xs }}>
                <StatusBadge label={c.status[b.status]} tone={STATUS_STYLE[b.status].tone} icon={STATUS_STYLE[b.status].icon} />
                <Text>{`${formatTime(b.starts_at, locale)} · ${locale === "en" ? b.service_name_en : b.service_name_es}`}</Text>
                {b.status === "confirmed" ? (
                  <Button
                    label={c.staff.actions.checkIn}
                    loading={action.isPending}
                    onPress={() =>
                      action.mutate(
                        { id: b.id, action: "checkIn" },
                        {
                          onSuccess: () =>
                            setResult({
                              ...result,
                              bookings: result.bookings.map((x) => (x.id === b.id ? { ...x, status: "checked_in" } : x)),
                            }),
                          onError: fail,
                        },
                      )
                    }
                  />
                ) : null}
                {!used && (b.status === "confirmed" || b.status === "checked_in" || b.status === "in_progress") ? (
                  <Button
                    variant="ghost"
                    label={c.scan.complete}
                    loading={complete.isPending}
                    disabled={complete.isPending || walkIn.isPending}
                    testID={`scan-complete-${b.id}`}
                    onPress={() =>
                      Alert.alert(c.scan.completeTitle, c.scan.completeBody(locale === "en" ? b.service_name_en : b.service_name_es), [
                        { text: c.common.no, style: "cancel" },
                        {
                          text: c.common.yes,
                          onPress: () => complete.mutate({ scanId: result.scan_id, bookingId: b.id }, { onSuccess: onWashDone, onError: fail }),
                        },
                      ])
                    }
                  />
                ) : null}
              </View>
            ))}
          </Card>

          {!used && result.walk_in_services.length > 0 ? (
            <Card>
              <Text variant="eyebrow" tone="accent">
                {c.scan.walkIn}
              </Text>
              <Text variant="bodySm" tone="muted">
                {c.scan.walkInHint}
              </Text>
              <ChoiceChips
                label={c.scan.walkInService}
                value={walkService ?? ""}
                onChange={setWalkService}
                options={result.walk_in_services.map((s) => ({ value: s.id, label: locale === "en" ? s.name_en : s.name_es }))}
                testIDPrefix="walkin-service"
              />
              <ChoiceChips
                label={c.scan.walkInVehicle}
                value={walkVehicle}
                onChange={setWalkVehicle}
                options={[
                  ...result.vehicles.map((v) => ({
                    value: `id:${v.id}`,
                    label: [v.nickname, v.make, v.model, v.plate].filter(Boolean).join(" · ") || c.garage.kinds[v.kind],
                  })),
                  ...(["car", "suv", "large"] as const).map((k) => ({ value: `kind:${k}`, label: c.scan.walkInNewVehicle(c.garage.kinds[k]) })),
                ]}
                testIDPrefix="walkin-vehicle"
              />
              <Button
                label={c.scan.walkInSubmit}
                disabled={!walkService || complete.isPending}
                loading={walkIn.isPending}
                testID="walkin-submit"
                onPress={() =>
                  walkService &&
                  walkIn.mutate(
                    {
                      scanId: result.scan_id,
                      serviceId: walkService,
                      vehicleId: walkVehicle.startsWith("id:") ? walkVehicle.slice(3) : null,
                      vehicleKind: walkVehicle.startsWith("kind:") ? walkVehicle.slice(5) : null,
                    },
                    { onSuccess: onWashDone, onError: fail },
                  )
                }
              />
            </Card>
          ) : null}

          {result.redemptions.length > 0 ? (
            <Card>
              <Text variant="eyebrow" tone="accent">
                {c.scan.redemptions}
              </Text>
              {result.redemptions.map((r) => (
                <View key={r.id} style={{ gap: space.xs }}>
                  <Text variant="displaySm">{`${r.code} · ${locale === "en" ? r.reward_name_en : r.reward_name_es}`}</Text>
                  <Button
                    variant="ghost"
                    label={c.scan.use}
                    loading={markUsed.isPending}
                    onPress={() =>
                      markUsed.mutate(r.id, {
                        onSuccess: () => {
                          Alert.alert(c.scan.used);
                          setResult({ ...result, redemptions: result.redemptions.filter((x) => x.id !== r.id) });
                        },
                        onError: fail,
                      })
                    }
                  />
                </View>
              ))}
            </Card>
          ) : null}

          {result.gift_cards.length > 0 ? (
            <Card>
              <Text variant="eyebrow" tone="accent">
                {c.scan.giftCards}
              </Text>
              {result.gift_cards.map((g) => {
                const amount = parseAmount(amounts[g.id] ?? "");
                return (
                  <View key={g.id} style={{ gap: space.xs }}>
                    <StatusBadge label={c.commerce.balance(money(Number(g.balance), g.currency))} tone="success" icon={CreditCard} />
                    <Field
                      label={c.scan.redeemAmount}
                      value={amounts[g.id] ?? ""}
                      onChangeText={(v) => setAmounts({ ...amounts, [g.id]: v })}
                      keyboardType="decimal-pad"
                    />
                    <Button
                      variant="ghost"
                      label={c.scan.redeem}
                      disabled={amount === null || amount > Number(g.balance)}
                      loading={redeemCard.isPending}
                      onPress={() =>
                        amount !== null &&
                        redeemCard.mutate(
                          { id: g.id, amount },
                          {
                            onSuccess: (left) => {
                              Alert.alert(c.scan.redeemed(money(Number(left), g.currency)));
                              setAmounts({ ...amounts, [g.id]: "" });
                              setResult({
                                ...result,
                                gift_cards: result.gift_cards
                                  .map((x) => (x.id === g.id ? { ...x, balance: Number(left) } : x))
                                  .filter((x) => x.balance > 0),
                              });
                            },
                            onError: fail,
                          },
                        )
                      }
                    />
                  </View>
                );
              })}
            </Card>
          ) : null}

          <Button
            variant="ghost"
            label={c.scan.again}
            onPress={reset}
            testID="scan-again"
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraBox: { height: 360, borderRadius: radius.panel, overflow: "hidden", backgroundColor: palette.surface },
});
