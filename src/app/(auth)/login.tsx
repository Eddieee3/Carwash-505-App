import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { supabase } from "@/api/supabase";
import { Button, Field, Screen, space, Text } from "@/design";
import { emailSchema, normalizeEmail } from "@/features/auth/schemas";
import { getCopy } from "@/i18n";

export default function Login() {
  const c = getCopy();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit() {
    const normalized = normalizeEmail(email);
    if (!emailSchema.safeParse(normalized).success) {
      setError(c.login.invalid);
      return;
    }
    if (!supabase) return;
    setBusy(true);
    setError(undefined);
    // shouldCreateUser: el primer ingreso crea la cuenta; el trigger la registra como cliente (nunca como personal).
    const { error: otpError } = await supabase.auth.signInWithOtp({ email: normalized, options: { shouldCreateUser: true } });
    setBusy(false);
    if (otpError) {
      setError(c.login.failed);
      return;
    }
    router.push({ pathname: "/verify", params: { email: normalized } });
  }

  return (
    <Screen>
      <View style={{ gap: space.xl, flex: 1, justifyContent: "flex-end" }}>
        <Text variant="displayMd">{c.login.title}</Text>
        <Field
          label={c.login.label}
          placeholder={c.login.placeholder}
          value={email}
          onChangeText={setEmail}
          error={error}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={submit}
          testID="login-email"
        />
        <Button label={c.login.submit} onPress={submit} loading={busy} testID="login-submit" />
      </View>
    </Screen>
  );
}
