import { Check, Crown, Gift } from "lucide-react-native";
import * as Linking from "expo-linking";
import type { ReactNode } from "react";
import { ActivityIndicator, Alert, Platform, StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
// Import directo (no el índice @/design): el índice carga las fuentes y así el componente se prueba con Jest.
import { Button } from "@/design/components/Button";
import { Card } from "@/design/components/Card";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { palette, radius, space, status } from "@/design/tokens";
import { getCopy } from "@/i18n";
import type { VipCardState } from "@/shared/database";
import { useAddToPhoneWallet, useVipCard, useWalletPassStatus, useWalletToken } from "./api";
import { walletQrPayload } from "./qr";

/** Wallets del teléfono que se pueden ofrecer aquí: Apple en iPhone, Google en Android; en web, las configuradas. */
function usePhoneWallets() {
  const status = useWalletPassStatus();
  const platforms = (["google", "apple"] as const).filter(
    (p) => status.data?.[p] && (Platform.OS === "web" || (Platform.OS === "ios" ? p === "apple" : p === "google")),
  );
  return { platforms, ready: !status.isLoading };
}

/**
 * Perfil: Tarjeta VIP. Con Apple/Google Wallet configurado, el pase nativo lleva el QR y las casillas y aquí solo
 * queda el botón para añadirlo. Mientras no haya credenciales, se muestran las casillas y el QR de la app para que
 * el personal pueda escanear igual. Si el programa VIP está apagado, no se muestra nada.
 */
export function VipCard() {
  const c = getCopy();
  const card = useVipCard();
  const { platforms, ready } = usePhoneWallets();
  if (!card.data?.enabled) return null;

  if (platforms.length > 0) {
    return (
      <Card testID="vip-card-phone">
        <View style={styles.title}>
          <Crown size={18} color={status.warning} />
          <Text variant="eyebrow" style={{ color: status.warning }}>
            {c.vipCard.title}
          </Text>
        </View>
        <Text variant="displaySm">{c.vipCard.summary(card.data.filled, card.data.card_slots)}</Text>
        <AddToPhoneWallet platforms={platforms} />
      </Card>
    );
  }
  return <VipCardView card={card.data}>{ready ? <AppQr /> : null}</VipCardView>;
}

/** QR de la app (token de 90 s que se renueva solo): respaldo mientras no hay pase de Apple/Google Wallet. */
function AppQr() {
  const c = getCopy();
  const token = useWalletToken(true);
  return (
    <View style={styles.qrWrap}>
      {/* Placa sólida sobre el vidrio: el lector necesita el margen claro (quiet zone) alrededor del código. */}
      <View style={styles.qrPlate} testID="vip-app-qr">
        {token.data ? (
          <QRCode value={walletQrPayload(token.data.token)} size={200} color="#000000" backgroundColor="#ffffff" quietZone={14} ecl="M" />
        ) : (
          <ActivityIndicator color={palette.brand} />
        )}
      </View>
      <Text variant="bodySm" tone="muted" style={{ textAlign: "center" }}>
        {c.vipCard.showCode}
      </Text>
    </View>
  );
}

/** Botón "Añadir Tarjeta VIP a Apple Wallet / Google Wallet": el servidor arma el pase y el teléfono lo abre. */
function AddToPhoneWallet({ platforms }: { platforms: readonly ("google" | "apple")[] }) {
  const c = getCopy();
  const add = useAddToPhoneWallet();
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="bodySm" tone="muted">
        {c.vipCard.addHint}
      </Text>
      {platforms.map((p) => (
        <Button
          key={p}
          label={p === "apple" ? c.vipCard.addApple : c.vipCard.addGoogle}
          loading={add.isPending && add.variables === p}
          disabled={add.isPending}
          onPress={() =>
            add.mutate(p, {
              onSuccess: (url) => Linking.openURL(url),
              onError: () => Alert.alert(c.vipCard.addError),
            })
          }
          testID={`vip-add-${p}`}
        />
      ))}
    </View>
  );
}

/**
 * Tarjeta de casillas: una por lavado terminado (la marca la base de datos, nunca la app).
 * La última casilla es el lavado gratis.
 */
export function VipCardView({ card, children }: { card: VipCardState; children?: ReactNode }) {
  const c = getCopy();
  const theme = useTheme();
  const slots = Array.from({ length: card.card_slots }, (_, i) => i + 1);
  const remaining = card.card_slots - 1 - card.filled;

  return (
    <Card accessibilityLabel={`${c.vipCard.title}, ${c.vipCard.progress(card.filled, card.card_slots)}`} testID="vip-card">
      <View style={styles.header}>
        <View style={styles.title}>
          <Crown size={18} color={status.warning} />
          <Text variant="eyebrow" style={{ color: status.warning }}>
            {c.vipCard.title}
          </Text>
        </View>
        <Text variant="number" tone="muted">
          {c.vipCard.progress(card.filled, card.card_slots)}
        </Text>
      </View>

      <View style={styles.grid} accessibilityRole="list">
        {slots.map((n) => {
          const done = n <= card.filled;
          const free = n === card.card_slots;
          const nextUp = n === card.filled + 1;
          return (
            <View key={n} style={styles.cell} accessibilityLabel={free ? c.vipCard.freeSlot(n, done) : c.vipCard.slot(n, done)}>
              <View
                testID={`vip-slot-${n}`}
                style={[
                  styles.slot,
                  { borderColor: theme.line },
                  free && { borderColor: status.warning, borderStyle: "dashed" },
                  nextUp && { borderColor: free ? status.warning : palette.cyan, borderStyle: "solid" },
                  done && { backgroundColor: free ? status.warning : palette.brand, borderColor: free ? status.warning : palette.cyan },
                ]}
              >
                {done ? (
                  <Check size={18} color="#ffffff" strokeWidth={3} />
                ) : free ? (
                  <Gift size={18} color={status.warning} />
                ) : (
                  <Text variant="label" tone="muted">
                    {n}
                  </Text>
                )}
              </View>
              {free ? (
                <Text variant="bodySm" style={[styles.freeLabel, { color: status.warning }]}>
                  {c.vipCard.free}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

      <Text variant="label" style={card.next_is_free ? { color: status.warning } : undefined}>
        {card.next_is_free ? c.vipCard.nextFree : c.vipCard.remaining(remaining)}
      </Text>
      <Text variant="bodySm" tone="muted">
        {c.vipCard.howItWorks}
        {card.free_washes_earned > 0 ? ` ${c.vipCard.earned(card.free_washes_earned)}.` : ""}
      </Text>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  title: { flexDirection: "row", alignItems: "center", gap: space.xs },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: space.sm },
  cell: { width: "20%", alignItems: "center", gap: 2 },
  slot: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  freeLabel: { fontSize: 11, lineHeight: 13 },
  qrWrap: { alignItems: "center", gap: space.sm, paddingTop: space.sm },
  qrPlate: {
    width: 228,
    height: 228,
    borderRadius: radius.control,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
