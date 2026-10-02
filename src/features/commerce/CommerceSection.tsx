import { CreditCard, Crown, Receipt } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { Alert } from "@/lib/alert";
import { Button, Card, ChoiceChips, Field, space, StatusBadge, Text } from "@/design";
import { bookingErrorMessage } from "@/features/booking/errors";
import { currentLocale, getCopy } from "@/i18n";
import { formatPrice } from "@/lib/price";
import { formatDateLong } from "@/lib/time";
import { useCancelOrder, useCommerce, useRequestGiftCard, useRequestMembership, useTransferGiftCard } from "./api";

/** Wallet: membresía, gift cards y órdenes por pagar en el local. Todo se oculta si el negocio no lo activó. */
export function CommerceSection() {
  const c = getCopy();
  const locale = currentLocale();
  const commerce = useCommerce();
  const requestPlan = useRequestMembership();
  const requestCard = useRequestGiftCard();
  const cancelOrder = useCancelOrder();
  const transfer = useTransferGiftCard();
  const [amount, setAmount] = useState<string | null>(null);
  const [giftTo, setGiftTo] = useState<{ id: string; code: string } | null>(null);
  const fail = (e: unknown) => Alert.alert(bookingErrorMessage(e, c));
  const money = (n: number | null, cur: string) => formatPrice(n, cur, locale) ?? "—";
  const ordered = (code: string) => Alert.alert(c.commerce.orderCreated(code));

  const m = commerce.data;
  if (!m) return null;
  const plans = m.plans.filter((p) => p.purchasable);

  return (
    <>
      {m.membership || plans.length > 0 ? (
        <Card>
          <Text variant="eyebrow" tone="accent">
            {c.commerce.membership}
          </Text>
          {m.membership ? (
            <>
              <StatusBadge label={locale === "en" ? m.membership.name_en : m.membership.name_es} tone="warning" icon={Crown} />
              <Text tone="muted">{c.commerce.activeUntil(formatDateLong(m.membership.ends_at, locale))}</Text>
            </>
          ) : null}
          {plans.map((p) => (
            <View key={p.code} style={{ gap: space.xs }}>
              <Text variant="displaySm">{`${locale === "en" ? p.name_en : p.name_es} · ${money(p.price, p.currency)}`}</Text>
              <Text variant="bodySm" tone="muted">
                {c.commerce.period(p.period_days)}
              </Text>
              {(locale === "en" ? p.benefits_en : p.benefits_es).map((b) => (
                <Text key={b}>{`· ${b}`}</Text>
              ))}
              <Button
                variant="ghost"
                label={m.membership?.plan_code === p.code ? c.commerce.renew : c.commerce.request}
                disabled={requestPlan.isPending}
                onPress={() =>
                  Alert.alert(c.commerce.payInStoreTitle, c.commerce.payInStoreBody, [
                    { text: c.common.no, style: "cancel" },
                    { text: c.common.yes, onPress: () => requestPlan.mutate(p.code, { onSuccess: (o) => ordered(o.code), onError: fail }) },
                  ])
                }
              />
            </View>
          ))}
        </Card>
      ) : null}

      {m.gift_cards.length > 0 || m.gift_cards_enabled ? (
        <Card>
          <Text variant="eyebrow" tone="accent">
            {c.commerce.giftCards}
          </Text>
          {m.gift_cards.map((g) => (
            <View key={g.id} style={{ gap: space.xs }}>
              <StatusBadge label={c.commerce.balance(money(Number(g.balance), g.currency))} tone="success" icon={CreditCard} />
              {g.expires_at ? (
                <Text variant="bodySm" tone="muted">
                  {c.commerce.expires(formatDateLong(g.expires_at, locale))}
                </Text>
              ) : null}
              {giftTo?.id === g.id ? (
                <>
                  <Field
                    label={c.commerce.giftToCode}
                    value={giftTo.code}
                    onChangeText={(code) => setGiftTo({ id: g.id, code })}
                    autoCapitalize="characters"
                    maxLength={8}
                  />
                  <Button
                    variant="ghost"
                    label={c.commerce.giftConfirm}
                    disabled={giftTo.code.trim().length < 8 || transfer.isPending}
                    onPress={() =>
                      transfer.mutate(giftTo, {
                        onSuccess: () => {
                          setGiftTo(null);
                          Alert.alert(c.commerce.gifted);
                        },
                        onError: fail,
                      })
                    }
                  />
                </>
              ) : (
                <Button variant="quiet" label={c.commerce.gift} onPress={() => setGiftTo({ id: g.id, code: "" })} />
              )}
            </View>
          ))}
          {m.gift_cards_enabled ? (
            <>
              <Text variant="label">{c.commerce.buyGiftCard}</Text>
              <ChoiceChips
                label={c.commerce.buyGiftCard}
                value={amount}
                onChange={setAmount}
                options={m.gift_card_amounts.map((a) => ({ value: String(a), label: money(Number(a), m.gift_card_currency) }))}
              />
              <Button
                variant="ghost"
                label={c.commerce.request}
                disabled={amount === null || requestCard.isPending}
                onPress={() =>
                  amount &&
                  Alert.alert(c.commerce.payInStoreTitle, c.commerce.payInStoreBody, [
                    { text: c.common.no, style: "cancel" },
                    { text: c.common.yes, onPress: () => requestCard.mutate(Number(amount), { onSuccess: (o) => ordered(o.code), onError: fail }) },
                  ])
                }
              />
            </>
          ) : null}
        </Card>
      ) : null}

      {m.orders.length > 0 ? (
        <Card>
          <Text variant="eyebrow" tone="accent">
            {c.commerce.pendingOrders}
          </Text>
          <Text variant="bodySm" tone="muted">
            {c.commerce.payInStoreBody}
          </Text>
          {m.orders.map((o) => (
            <View key={o.id} style={{ gap: space.xs }}>
              <StatusBadge label={o.code} icon={Receipt} />
              <Text>{`${o.kind === "membership" ? c.commerce.orderMembership(o.plan_code ?? "") : c.commerce.orderGiftCard} · ${money(Number(o.amount), o.currency)}`}</Text>
              <Button variant="quiet" label={c.commerce.cancelOrder} onPress={() => cancelOrder.mutate(o.id, { onError: fail })} />
            </View>
          ))}
        </Card>
      ) : null}
    </>
  );
}
