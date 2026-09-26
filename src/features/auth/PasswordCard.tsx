import { useEffect, useState } from "react";
import { supabase } from "@/api/supabase";
import { Button, Card, Field, status, Text } from "@/design";
import { getCopy } from "@/i18n";
import { useAuth } from "./AuthProvider";
import { getRemembered, passwordProblem, remember } from "./remembered";

/**
 * "Entrar sin código": el usuario (ya dentro con el código) crea o cambia su contraseña.
 * La próxima vez entra con correo + contraseña desde la pantalla de login.
 */
export function PasswordCard() {
  const c = getCopy();
  const { session } = useAuth();
  const email = session?.user.email ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    getRemembered().then((r) => setHasPassword(!!r && r.email === email && r.hasPassword));
  }, [email]);

  async function save() {
    const problem = passwordProblem(password, confirm);
    if (problem) {
      setMessage({ ok: false, text: problem === "weak" ? c.password.weak : c.password.mismatch });
      return;
    }
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMessage({ ok: false, text: c.password.failed });
      return;
    }
    await remember(email, true);
    setHasPassword(true);
    setPassword("");
    setConfirm("");
    setMessage({ ok: true, text: c.password.saved });
  }

  return (
    <Card>
      <Text variant="eyebrow" tone="accent">
        {c.password.title}
      </Text>
      <Text tone="muted">{hasPassword ? c.password.bodyHasPassword : c.password.body}</Text>
      <Field
        label={c.password.label}
        hint={c.password.hint}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        testID="password-new"
      />
      <Field
        label={c.password.confirm}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={save}
        testID="password-confirm"
      />
      {message ? (
        <Text variant="bodySm" style={{ color: message.ok ? status.success : status.danger }} accessibilityRole="alert">
          {message.text}
        </Text>
      ) : null}
      <Button variant="ghost" label={c.password.save} loading={busy} onPress={save} testID="password-save" />
    </Card>
  );
}
