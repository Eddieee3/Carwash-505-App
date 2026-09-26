import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { supabase } from "@/api/supabase";
import { Button, Eyebrow, Field, Screen, space, Text } from "@/design";
import { staffEmail } from "@/features/auth/staff";
import { getCopy } from "@/i18n";

/**
 * Personal del local (admin del lobby y colaboradores): usuario + contraseña que les crea el dueño.
 * El rol lo decide la base de datos al entrar; esta pantalla solo inicia la sesión.
 */
export default function StaffLogin() {
  const c = getCopy();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!supabase) return;
    if (!username.trim() || !password) {
      setError(c.staffLogin.missing);
      return;
    }
    setBusy(true);
    setError(undefined);
    const { error: authError } = await supabase.auth.signInWithPassword({ email: staffEmail(username), password });
    setBusy(false);
    // Al iniciar sesión, el router lleva a cada rol a su pantalla (tablero de hoy).
    if (authError) setError(c.staffLogin.invalid);
  }

  return (
    <Screen>
      <View style={{ gap: space.xl, flex: 1, justifyContent: "flex-end" }}>
        <View style={{ gap: space.sm }}>
          <Eyebrow>{c.staffLogin.eyebrow}</Eyebrow>
          <Text variant="displayMd">{c.staffLogin.title}</Text>
          <Text tone="muted">{c.staffLogin.body}</Text>
        </View>
        <Field
          label={c.staffLogin.username}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          testID="staff-username"
        />
        <Field
          label={c.staffLogin.password}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          onSubmitEditing={submit}
          error={error}
          testID="staff-password"
        />
        <Button label={c.staffLogin.submit} loading={busy} onPress={submit} testID="staff-submit" />
        <Button variant="quiet" label={c.staffLogin.back} onPress={() => router.replace("/welcome")} />
      </View>
    </Screen>
  );
}
