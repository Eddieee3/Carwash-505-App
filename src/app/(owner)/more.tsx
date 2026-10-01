import { router, type Href } from "expo-router";
import { ChevronRight, CloudRain, FileChartColumn, LifeBuoy, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Card, Eyebrow, Screen, space, Text, touch, useTheme } from "@/design";
import { useAuth } from "@/features/auth/AuthProvider";
import { PasswordCard } from "@/features/auth/PasswordCard";
import { getCopy } from "@/i18n";

/** Propietario · Más (A03/A04): Reportes (estadísticas y exportaciones), Soporte (incidencias), cierres y seguridad. */
export default function OwnerMore() {
  const c = getCopy();
  const { signOut } = useAuth();
  return (
    <Screen edges={["top"]}>
      <View style={{ gap: space.sm }}>
        <Eyebrow>{c.owner.eyebrow}</Eyebrow>
        <Text variant="displayLg">{c.owner.tabs.more}</Text>
      </View>
      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        <LinkRow icon={FileChartColumn} title={c.reports.title} subtitle={c.owner.moreReports} href="/reports" />
        <LinkRow icon={LifeBuoy} title={c.owner.supportTitle} subtitle={c.owner.moreSupport} href="/support" />
        <LinkRow icon={CloudRain} title={c.owner.closures} subtitle={c.owner.moreClosures} href="/dashboard" />
      </Card>
      <Text variant="eyebrow" tone="accent" accessibilityRole="header">
        {c.owner.security}
      </Text>
      <PasswordCard />
      <Button variant="quiet" label={c.common.signOut} onPress={signOut} />
    </Screen>
  );
}

function LinkRow({ icon: Icon, title, subtitle, href }: { icon: LucideIcon; title: string; subtitle: string; href: Href }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`${title}. ${subtitle}`} onPress={() => router.push(href)} style={styles.row}>
      <Icon size={22} color={theme.accent} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="label">{title}</Text>
        <Text variant="bodySm" tone="muted">
          {subtitle}
        </Text>
      </View>
      <ChevronRight size={20} color={theme.fgMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: touch.min + 8, flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm },
});
