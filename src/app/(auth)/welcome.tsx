import { Image } from "expo-image";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button, Eyebrow, Screen, space, Text } from "@/design";
import { getCopy } from "@/i18n";

/** Bienvenida: clientes entran con su correo; el personal del local, con usuario y contraseña. */
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
        {/* Personal del local: usuario y contraseña que crea el dueño. */}
        <Button variant="quiet" label={c.welcome.staff} onPress={() => router.push("/staff-login")} testID="welcome-staff" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: space.xxxl },
  logo: { width: 220, height: 113 },
  bottom: { gap: space.lg },
});
