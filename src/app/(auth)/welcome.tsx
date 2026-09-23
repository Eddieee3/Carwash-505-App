import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button, Eyebrow, Screen, space, Text } from "@/design";
import { getCopy } from "@/i18n";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export default function Welcome() {
  const c = getCopy();
  return (
    <Screen>
      <View style={styles.top}>
        {/* Logo oficial: nunca se recrea con texto. */}
        <Image
          source={require("@/assets/brand/carwash505-logo-blanco.png")}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="Car Wash 505"
        />
      </View>
      <View style={styles.bottom}>
        <Eyebrow>{c.welcome.eyebrow}</Eyebrow>
        <Text variant="displayLg">{c.welcome.title}</Text>
        <Text tone="muted">{c.welcome.body}</Text>
        <Button label={c.welcome.cta} onPress={() => router.push("/login")} testID="welcome-cta" />
        <Button variant="quiet" label={c.common.whatsapp} onPress={() => Linking.openURL(buildWhatsAppUrl())} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: space.xxxl },
  logo: { width: 220, height: 113 },
  bottom: { gap: space.lg },
});
