import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { supabase } from "@/api/supabase";
import { Button, Field, Screen, space, Text } from "@/design";
import { forget, getRemembered, remember } from "@/features/auth/remembered";
import { emailSchema, normalizeEmail } from "@/features/auth/schemas";
import { getCopy } from "@/i18n";

/**
 * Entrar con correo: por código (el primer ingreso crea la cuenta) o con contraseña (si el cliente ya creó una
 * en su perfil). El dispositivo recuerda el último correo y, si esa cuenta tiene contraseña, abre en ese modo.
 */
export default function Login() {
  const c = getCopy();
  const [value, setValue] = useState("");
  const [password, setPassword] = useState("");
  const [withPassword, setWithPassword] = useState(false);
  const [recognized, setRecognized] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getRemembered().then((r) => {
      if (!r) return;
      setValue(r.email);
      setRecognized(r.email);
      setWithPassword(r.hasPassword);
    });
  }, []);

  async function submit() {
    if (!supabase) return;
    const normalized = normalizeEmail(value);
    if (!emailSchema.safeParse(normalized).success) {
      setError(c.login.invalid);
      return;
    }
    if (withPassword) {
      if (!password) {
        setError(c.login.passwordMissing);
        return;
      }
      setBusy(true);
      setError(undefined);
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      });
      setBusy(false);
      if (authError) {
        setError(c.login.passwordFailed);
        return;
      }
      await remember(normalized, true); // el router lleva a cada rol a su pantalla
      return;
    }
    setBusy(true);
    setError(undefined);
    // shouldCreateUser: el primer ingreso crea la cuenta; el trigger la registra como cliente (nunca como personal).
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (otpError) {
      setError(c.login.failed);
      return;
    }
    await remember(normalized);
    router.push({ pathname: "/verify", params: { email: normalized } });
  }

  return (
    <Screen>
      <View style={{ gap: space.xl, flex: 1, justifyContent: "flex-end" }}>
        <Text variant="displayMd">{c.login.title}</Text>
        <>
          {recognized && value === recognized ? (
            <Text tone="muted">{c.login.welcomeBack(recognized)}</Text>
          ) : null}
          <Field
            label={c.login.label}
            placeholder={c.login.placeholder}
            value={value}
            onChangeText={setValue}
            error={withPassword ? undefined : error}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType={withPassword ? "next" : "send"}
            onSubmitEditing={withPassword ? undefined : submit}
            testID="login-email"
          />
          {withPassword ? (
            <Field
              label={c.login.passwordLabel}
              value={password}
              onChangeText={setPassword}
              error={error}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              testID="login-password"
            />
          ) : null}
        </>
        <Button
          label={withPassword ? c.login.submitPassword : c.login.submit}
          onPress={submit}
          loading={busy}
          testID="login-submit"
        />
        <Button
          variant="quiet"
          label={withPassword ? c.login.withCode : c.login.withPassword}
          onPress={() => {
            setWithPassword(!withPassword);
            setError(undefined);
          }}
          testID="login-toggle-password"
        />
        {recognized ? (
          <Button
            variant="quiet"
            label={c.login.notYou}
            onPress={() => {
              void forget();
              setRecognized(null);
              setValue("");
              setPassword("");
              setWithPassword(false);
            }}
          />
        ) : null}
      </View>
    </Screen>
  );
}
