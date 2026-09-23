import { CameraView, useCameraPermissions } from "expo-camera";
import { Stack } from "expo-router";
import { CreditCard, Crown, Receipt } from "lucide-react-native";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button, Card, EmptyState, Field, fonts, palette, radius, Screen, space, StatusBadge, Text } from "@/design";
import { useBoardAction } from "@/features/board/api";
import { bookingErrorMessage } from "@/features/booking/errors";
import { STATUS_STYLE } from "@/features/booking/status";
import { useConfirmPayment, useRedeemGiftCard } from "@/features/commerce/api";
import { useMarkRedemptionUsed, useResolveWallet } from "@/features/loyalty/api";
import { parseWalletQr } from "@/features/loyalty/qr";
import { currentLocale, getCopy } from "@/i18n";
import { formatPrice, parseAmount } from "@/lib/price";
import { formatDateLong, formatTime } from "@/lib/time";
import type { WalletScan } from "@/shared/database";

/**
 * Personal: escanear el QR de la wallet → cliente, VIP, membresía, puntos, check-in de su reserva de hoy,
 * canjes por usar, cobro con gift card y confirmación de pagos hechos en el local.
 */
export default function Scan() {
  const c = getCopy();
  const locale = currentLocale();
  const [permission, requestPermission] = useCameraPermissions();
  const resolve = useResolveWallet();
  const markUsed = useMarkRedemptionUsed();
  const action = useBoardAction();
  const confirmPayment = useConfirmPayment();
  const redeemCard = useRedeemGiftCard();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [result, setResult] = useState<WalletScan | null>(null);
  const fail = (e: unknown) => Alert.alert(bookingErrorMessage(e, c));
  const money = (n: number, cur: string) => formatPrice(n, cur, locale) ?? String(n);

  function onScanned(data: string) {
    if (resolve.isPending || result) return;
    const token = parseWalletQr(data);
    if (!token) {
      Alert.alert(c.scan.invalid);
      return;
    }
    resolve.mutate(token, { onSuccess: setResult, onError: fail });
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
              </View>
            ))}
          </Card>

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
            onPress={() => {
              setResult(null);
              setAmounts({});
            }}
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
