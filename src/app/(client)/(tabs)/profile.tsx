import { router } from "expo-router";
import { Button, Card, Screen, Text } from "@/design";
import { useAuth } from "@/features/auth/AuthProvider";
import { PasswordCard } from "@/features/auth/PasswordCard";
import { LoyaltySection } from "@/features/loyalty/LoyaltySection";
import { VipCard } from "@/features/loyalty/VipCard";
import { MarketingPreferences } from "@/features/pricing/MarketingPreferences";
import { getCopy } from "@/i18n";

/** Perfil: Tarjeta VIP (botón para Apple/Google Wallet), cuenta, puntos y beneficios. */
export default function ClientProfile() {
  const c = getCopy();
  const { session, signOut } = useAuth();
  return (
    <Screen edges={["top"]}>
      <Text variant="displayLg">{c.client.profileTitle}</Text>
      <VipCard />
      <Card>
        <Text variant="label" tone="muted">
          {c.client.emailLabel}
        </Text>
        <Text>{session?.user.email ?? ""}</Text>
      </Card>
      <PasswordCard />
      <LoyaltySection />
      <MarketingPreferences />
      <Button variant="ghost" label={c.client.vehicles} onPress={() => router.push("/vehicles")} testID="profile-vehicles" />
      <Button variant="ghost" label={c.client.history} onPress={() => router.push("/history")} testID="profile-history" />
      <Button variant="ghost" label={c.client.tickets} onPress={() => router.push("/support")} testID="profile-tickets" />
      <Button variant="quiet" label={c.common.signOut} onPress={signOut} testID="sign-out" />
    </Screen>
  );
}
