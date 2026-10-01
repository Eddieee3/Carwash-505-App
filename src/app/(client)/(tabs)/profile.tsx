import { router, type Href } from "expo-router";
import { CarFront, ChevronDown, ChevronRight, ChevronUp, History, LifeBuoy, LockKeyhole, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Button, Card, Screen, space, Text, touch, useTheme } from "@/design";
import { useAuth } from "@/features/auth/AuthProvider";
import { PasswordCard } from "@/features/auth/PasswordCard";
import { LoyaltySection } from "@/features/loyalty/LoyaltySection";
import { VipCard } from "@/features/loyalty/VipCard";
import { MarketingPreferences } from "@/features/pricing/MarketingPreferences";
import { getCopy } from "@/i18n";

/**
 * Perfil (C03): Tarjeta VIP compacta (el QR se amplía aparte), accesos a vehículos, historial y soporte, cuenta y
 * seguridad (crear o cambiar contraseña), beneficios y cierre de sesión. Menos desplazamiento, mismas funciones.
 */
export default function ClientProfile() {
  const c = getCopy();
  const theme = useTheme();
  const { session, signOut } = useAuth();
  const [security, setSecurity] = useState(false);

  return (
    <Screen edges={["top"]}>
      <Text variant="displayLg" accessibilityRole="header">
        {c.client.profileTitle}
      </Text>
      <VipCard />

      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        <LinkRow icon={CarFront} label={c.client.vehicles} href="/vehicles" testID="profile-vehicles" />
        <LinkRow icon={History} label={c.client.history} href="/history" testID="profile-history" />
        <LinkRow icon={LifeBuoy} label={c.client.tickets} href="/support" testID="profile-tickets" />
      </Card>

      <Card>
        <Text variant="eyebrow" tone="accent" accessibilityRole="header">
          {c.client.account}
        </Text>
        <Text variant="label" tone="muted">
          {c.client.emailLabel}
        </Text>
        <Text>{session?.user.email ?? ""}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: security }}
          onPress={() => setSecurity(!security)}
          style={styles.row}
          testID="profile-security"
        >
          <LockKeyhole size={20} color={theme.accent} />
          <Text style={{ flex: 1 }}>{c.client.security}</Text>
          {security ? <ChevronUp size={18} color={theme.fgMuted} /> : <ChevronDown size={18} color={theme.fgMuted} />}
        </Pressable>
      </Card>
      {security ? <PasswordCard /> : null}

      <LoyaltySection />
      <MarketingPreferences />
      <Button variant="quiet" label={c.common.signOut} onPress={signOut} testID="sign-out" />
    </Screen>
  );
}

function LinkRow({ icon: Icon, label, href, testID }: { icon: LucideIcon; label: string; href: Href; testID?: string }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={() => router.push(href)} style={styles.row} testID={testID}>
      <Icon size={20} color={theme.accent} />
      <Text style={{ flex: 1 }}>{label}</Text>
      <ChevronRight size={18} color={theme.fgMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: touch.min + 4, flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.xs },
});
