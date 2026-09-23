import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { supabase } from "@/api/supabase";
import { Button, Field, Screen, space, Text } from "@/design";
import { otpSchema } from "@/features/auth/schemas";
import { getCopy } from "@/i18n";

export default function Verify() {
  const c = getCopy();
  const { email = "" } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [hint, setHint] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit() {
    const parsed = otpSchema.safeParse(code);
    if (!parsed.success) {
      setError(c.verify.invalid);
      return;
    }
    if (!supabase) return;
    setBusy(true);
    setError(undefined);
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: parsed.data, type: "email" });
    setBusy(false);
    // Si es correcto, la sesión cambia y las rutas protegidas llevan a la zona del rol.
    if (verifyError) setError(c.verify.failed);
  }

  async function resend() {
    if (!supabase) return;
    setError(undefined);
    const { error: otpError } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (otpError) setError(c.login.failed);
    else setHint(c.verify.resent);
  }

  return (
    <Screen>
      <View style={{ gap: space.xl, flex: 1, justifyContent: "flex-end" }}>
        <Text variant="displayMd">{c.verify.title}</Text>
        <Text tone="muted">{c.verify.body(email)}</Text>
        <Field
          label={c.verify.label}
          value={code}
          onChangeText={setCode}
          error={error}
          hint={hint}
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          returnKeyType="done"
          onSubmitEditing={submit}
          testID="verify-code"
        />
        <Button label={c.verify.submit} onPress={submit} loading={busy} testID="verify-submit" />
        <Button variant="quiet" label={c.verify.resend} onPress={resend} />
        <Button variant="quiet" label={c.verify.change} onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
