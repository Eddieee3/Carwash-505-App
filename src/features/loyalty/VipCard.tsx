import { Check, Crown, Gift, Maximize2, X } from "lucide-react-native";
import * as Linking from "expo-linking";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Alert, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
// Import directo (no el índice @/design): el índice carga las fuentes y así el componente se prueba con Jest.
import { Button } from "@/design/components/Button";
import { Card } from "@/design/components/Card";
import { Text } from "@/design/components/Text";
import { useTheme } from "@/design/theme";
import { palette, radius, space, status, touch } from "@/design/tokens";
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
        <Text variant="displaySm">{c.vipCard.summary(card.data.filled, paidRequired(card.data))}</Text>
        <AddToPhoneWallet platforms={platforms} />
      </Card>
    );
  }
  return <VipCardView card={card.data}>{ready ? <AppQr /> : null}</VipCardView>;
}

/** Lavados pagados que pide la regla (9 de 10: la última casilla es el lavado gratis). */
const paidRequired = (card: VipCardState) => card.paid_required ?? card.card_slots - 1;

/**
 * QR de la app (token de 90 s que se renueva solo): respaldo mientras no hay pase de Apple/Google Wallet.
 * En el perfil se muestra compacto; "Ampliar código" lo abre grande para el lector del local (C03).
 */
function AppQr() {
  const c = getCopy();
  const theme = useTheme();
  const token = useWalletToken(true);
  const [open, setOpen] = useState(false);
  // C04: la carga termina en el código o en un error con "Reintentar" (nunca en un indicador sin fin).
  const code = (size: number) =>
    token.data ? (
      <QRCode value={walletQrPayload(token.data.token)} size={size} color="#000000" backgroundColor="#ffffff" quietZone={12} ecl="M" />
    ) : token.isError ? (
      <Pressable accessibilityRole="button" accessibilityLabel={`${c.vipCard.qrError}. ${c.common.retry}`} onPress={() => token.refetch()} style={styles.qrError}>
        <Text variant="bodySm" style={{ color: "#000000", textAlign: "center" }}>
          {c.vipCard.qrError}
        </Text>
        <Text variant="label" style={{ color: palette.brand }}>
          {c.common.retry}
        </Text>
      </Pressable>
    ) : (
      <ActivityIndicator color={palette.brand} accessibilityLabel={c.common.loading} />
    );
  return (
    <View style={styles.qrRow}>
      {/* Placa sólida sobre el vidrio: el lector necesita el margen claro (quiet zone) alrededor del código. */}
      <View style={styles.qrPlateSmall} testID="vip-app-qr">
        {code(96)}
      </View>
      <View style={{ flex: 1, gap: space.sm }}>
        <Text variant="bodySm" tone="muted">
          {c.vipCard.showCode}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={c.vipCard.expandQr}
          onPress={() => setOpen(true)}
          style={[styles.expand, { borderColor: theme.lineStrong }]}
          testID="vip-qr-expand"
        >
          <Maximize2 size={16} color={theme.accent} />
          <Text variant="label">{c.vipCard.expandQr}</Text>
        </Pressable>
      </View>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.qrSheet, { backgroundColor: theme.bgRaised, borderColor: theme.line }]} accessibilityViewIsModal>
            <View style={styles.sheetHeader}>
              <Text variant="displaySm" accessibilityRole="header" style={{ flex: 1 }}>
                {c.vipCard.qrTitle}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel={c.vipCard.closeQr} onPress={() => setOpen(false)} style={styles.close}>
                <X size={22} color={theme.fg} />
              </Pressable>
            </View>
            <View style={styles.qrPlate}>{code(260)}</View>
            <Text variant="bodySm" tone="muted" style={{ textAlign: "center" }}>
              {c.vipCard.showCode}
            </Text>
          </View>
        </View>
      </Modal>
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
  // Una sola fuente (vip_card_state del servidor): contador, casillas y mensaje salen de los mismos números.
  const paid = paidRequired(card);
  const filled = Math.min(card.filled, paid);
  const remaining = card.remaining_paid ?? paid - filled;
  const slots = Array.from({ length: card.card_slots }, (_, i) => i + 1);
  const message = card.free_wash_reserved ? c.vipCard.reserved : card.next_is_free ? c.vipCard.nextFree : c.vipCard.remaining(remaining);

  return (
    <Card accessibilityLabel={`${c.vipCard.title}, ${c.vipCard.progress(filled, paid)}. ${message}`} testID="vip-card">
      <View style={styles.header}>
        <View style={styles.title}>
          <Crown size={18} color={status.warning} />
          <Text variant="eyebrow" style={{ color: status.warning }}>
            {c.vipCard.title}
          </Text>
        </View>
        <Text variant="number" tone="muted">
          {c.vipCard.progress(filled, paid)}
        </Text>
      </View>

      <View style={styles.grid} accessibilityRole="list">
        {slots.map((n) => {
          // Marcada = relleno con ✓. Siguiente = borde punteado + "Siguiente" (no se confunde con una ganada).
          const free = n === card.card_slots;
          const done = !free && n <= filled;
          const nextUp = !done && (free ? card.next_is_free : n === filled + 1);
          return (
            <View key={n} style={styles.cell} accessibilityLabel={free ? c.vipCard.freeSlot(n, done) : c.vipCard.slot(n, done)}>
              <View
                testID={`vip-slot-${n}`}
                style={[
                  styles.slot,
                  { borderColor: theme.line },
                  free && { borderColor: status.warning, borderStyle: "dashed" },
                  nextUp && { borderColor: free ? status.warning : palette.cyan, borderStyle: "dashed", borderWidth: 2 },
                  done && { backgroundColor: palette.brand, borderColor: palette.cyan, borderStyle: "solid" },
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
              ) : nextUp ? (
                <Text variant="bodySm" style={[styles.freeLabel, { color: palette.cyan }]}>
                  {c.vipCard.nextSlot}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

      <Text variant="label" style={card.next_is_free ? { color: status.warning } : undefined} accessibilityLiveRegion="polite">
        {message}
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
  qrRow: { flexDirection: "row", alignItems: "center", gap: space.md, paddingTop: space.sm },
  qrError: { flex: 1, alignSelf: "stretch", alignItems: "center", justifyContent: "center", gap: 4, padding: space.xs },
  qrPlateSmall: {
    width: 112,
    height: 112,
    borderRadius: radius.control,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  expand: {
    minHeight: touch.min,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    alignSelf: "flex-start",
  },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: space.lg },
  qrSheet: { alignSelf: "center", alignItems: "center", borderRadius: radius.panel, borderWidth: 1, padding: space.lg, gap: space.md },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: space.md, alignSelf: "stretch" },
  close: { minWidth: touch.min, minHeight: touch.min, alignItems: "center", justifyContent: "center" },
  qrPlate: {
    width: 288,
    height: 288,
    borderRadius: radius.control,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
