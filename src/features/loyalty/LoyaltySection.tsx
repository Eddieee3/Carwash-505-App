import { Award, Crown, Gift } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Share, StyleSheet, View } from "react-native";
import { Button, Card, EmptyState, Field, palette, space, StatusBadge, Text } from "@/design";
import { bookingErrorMessage } from "@/features/booking/errors";
import { CommerceSection } from "@/features/commerce/CommerceSection";
import { ChallengesCard } from "@/features/pricing/ChallengesCard";
import { useApplyReferral, useCancelRedemption, useRedeem, useRewards, useWallet } from "./api";
import { currentLocale, getCopy } from "@/i18n";
import { formatDateLong } from "@/lib/time";

/**
 * Perfil del cliente: puntos, canjes, retos, membresías y gift cards, logros y referidos
 * (antes era la pestaña Wallet; el QR y las casillas ahora viven en el pase de Apple/Google Wallet).
 */
export function LoyaltySection() {
  const c = getCopy();
  const locale = currentLocale();
  const wallet = useWallet();
  const w = wallet.data;
  const rewards = useRewards(!!w?.loyalty_enabled);
  const redeem = useRedeem();
  const cancel = useCancelRedemption();
  const apply = useApplyReferral();
  const [code, setCode] = useState("");
  const fail = (e: unknown) => Alert.alert(bookingErrorMessage(e, c));
  const name = (x: { name_es: string; name_en: string }) => (locale === "en" ? x.name_en : x.name_es);

  if (wallet.isLoading) return <ActivityIndicator color={palette.cyan} accessibilityLabel={c.common.loading} />;
  if (!w) return <EmptyState title={c.errors.generic} action={{ label: c.common.retry, onPress: () => wallet.refetch() }} />;

  return (
    <View style={{ gap: space.lg }}>
      <Text variant="displaySm" accessibilityRole="header">
        {c.client.loyaltyTitle}
      </Text>

      {w.vip_since ? (
        <Card>
          <StatusBadge label={c.wallet.vip} tone="warning" icon={Crown} />
          <Text tone="muted">{c.wallet.vipSince(formatDateLong(w.vip_since, locale))}</Text>
        </Card>
      ) : w.vip_required_visits ? (
        <Card>
          <Text>{c.wallet.vipProgress(Math.min(w.vip_visits, w.vip_required_visits), w.vip_required_visits)}</Text>
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${Math.min(100, (100 * w.vip_visits) / w.vip_required_visits)}%` }]} />
          </View>
        </Card>
      ) : null}

      <Card>
        <Text variant="eyebrow" tone="accent">
          {c.wallet.points}
        </Text>
        {w.loyalty_enabled ? (
          <>
            <Text variant="displayLg">{`${w.balance} ${c.wallet.pointsUnit}`}</Text>
            {w.recent.slice(0, 5).map((m, i) => (
              <View key={i} style={styles.row}>
                <Text tone="muted">{c.wallet.reasons[m.reason] ?? m.reason}</Text>
                <Text variant="number">{m.delta > 0 ? `+${m.delta}` : String(m.delta)}</Text>
              </View>
            ))}
          </>
        ) : (
          <Text tone="muted">{c.wallet.pointsOff}</Text>
        )}
      </Card>

      {w.redemptions.length > 0 ? (
        <Card>
          <Text variant="eyebrow" tone="accent">
            {c.wallet.myRedemptions}
          </Text>
          {w.redemptions.map((r) => (
            <View key={r.id} style={{ gap: space.xs }}>
              <Text variant="displayMd">{r.code}</Text>
              <Text>{name({ name_es: r.reward_name_es, name_en: r.reward_name_en })}</Text>
              <Button
                variant="quiet"
                label={c.wallet.cancelRedemption}
                onPress={() =>
                  Alert.alert(c.wallet.cancelRedemptionTitle, c.wallet.cancelRedemptionBody, [
                    { text: c.common.no, style: "cancel" },
                    { text: c.common.yes, onPress: () => cancel.mutate(r.id, { onError: fail }) },
                  ])
                }
              />
            </View>
          ))}
        </Card>
      ) : null}

      {w.loyalty_enabled && (rewards.data ?? []).length > 0 ? (
        <Card>
          <Text variant="eyebrow" tone="accent">
            {c.wallet.rewards}
          </Text>
          {rewards.data!.map((r) => (
            <View key={r.id} style={{ gap: space.xs }}>
              <StatusBadge label={name(r)} icon={Gift} />
              {(locale === "en" ? r.description_en : r.description_es) ? (
                <Text tone="muted">{locale === "en" ? r.description_en : r.description_es}</Text>
              ) : null}
              <Button
                variant="ghost"
                label={c.wallet.redeem(r.cost_points)}
                disabled={w.balance < r.cost_points || redeem.isPending}
                onPress={() =>
                  Alert.alert(c.wallet.redeemTitle, name(r), [
                    { text: c.common.no, style: "cancel" },
                    {
                      text: c.common.yes,
                      onPress: () => redeem.mutate(r.id, { onSuccess: (x) => Alert.alert(c.wallet.redeemed(x.code)), onError: fail }),
                    },
                  ])
                }
              />
            </View>
          ))}
        </Card>
      ) : null}

      <ChallengesCard />

      <CommerceSection />

      <Card>
        <Text variant="eyebrow" tone="accent">
          {c.wallet.badges}
        </Text>
        {w.badges.map((b) => (
          <View key={b.code} style={[styles.badge, !b.earned_at && { opacity: 0.45 }]}>
            <StatusBadge label={name(b)} tone={b.earned_at ? "success" : "neutral"} icon={Award} />
            <Text variant="bodySm" tone="muted">
              {b.earned_at ? (locale === "en" ? b.description_en : b.description_es) : c.wallet.locked}
            </Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text variant="eyebrow" tone="accent">
          {c.wallet.referral}
        </Text>
        <Text variant="displayMd">{w.referral_code}</Text>
        <Text tone="muted">{c.wallet.referralBody}</Text>
        <Button variant="ghost" label={c.wallet.share} onPress={() => Share.share({ message: c.wallet.shareMessage(w.referral_code) })} />
        {!w.referred ? (
          <>
            <Text variant="label">{c.wallet.haveCode}</Text>
            <Field label={c.wallet.codeLabel} value={code} onChangeText={setCode} autoCapitalize="characters" maxLength={8} />
            <Button
              variant="quiet"
              label={c.wallet.apply}
              disabled={code.trim().length < 8 || apply.isPending}
              onPress={() => apply.mutate(code, { onSuccess: () => Alert.alert(c.wallet.applied), onError: fail })}
            />
          </>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between" },
  track: { height: 8, borderRadius: 4, backgroundColor: palette.surface, overflow: "hidden" },
  bar: { height: 8, backgroundColor: palette.signal },
  badge: { gap: space.xs },
});
