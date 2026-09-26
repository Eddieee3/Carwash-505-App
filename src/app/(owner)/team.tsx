import { ShieldCheck, UserRound, Wrench } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Button, Card, ChoiceChips, EmptyState, Eyebrow, Field, palette, Screen, space, status, StatusBadge, Text } from "@/design";
import { PasswordCard } from "@/features/auth/PasswordCard";
import { useCreateStaff, useSetStaffPassword, useTeam, useUpdateStaff, type StaffRole } from "@/features/team/api";
import { currentLocale, getCopy } from "@/i18n";
import { formatDateLong, formatTime } from "@/lib/time";
import type { StaffMember } from "@/shared/database";

const errorText = (e: unknown, errors: Record<string, string>) => {
  const code = e instanceof Error ? e.message : "";
  return errors[Object.keys(errors).find((k) => code.includes(k)) ?? "generic"];
};

/** Dueño: crea y administra las cuentas del personal (admin del lobby y colaboradores). */
export default function Team() {
  const c = getCopy();
  const team = useTeam();

  return (
    <Screen edges={["top"]}>
      <View style={{ gap: space.sm }}>
        <Eyebrow>{c.owner.eyebrow}</Eyebrow>
        <Text variant="displayLg">{c.team.title}</Text>
        <Text tone="muted">{c.team.intro}</Text>
      </View>

      {/* La cuenta del dueño: contraseña para entrar sin esperar el código. */}
      <PasswordCard />

      <CreateStaffCard />

      {team.isLoading ? (
        <ActivityIndicator color={palette.cyan} />
      ) : team.isError ? (
        <EmptyState title={c.errors.generic} action={{ label: c.common.retry, onPress: () => team.refetch() }} />
      ) : (team.data ?? []).length === 0 ? (
        <Text tone="muted">{c.team.empty}</Text>
      ) : (
        team.data!.map((m) => <StaffCard key={m.id} member={m} />)
      )}
    </Screen>
  );
}

function RoleChips({ value, onChange }: { value: StaffRole; onChange: (r: StaffRole) => void }) {
  const c = getCopy();
  return (
    <View style={{ gap: space.xs }}>
      <ChoiceChips
        label={c.team.role}
        value={value}
        onChange={onChange}
        options={(["lobby", "operator"] as const).map((r) => ({ value: r, label: c.team.roles[r] }))}
        testIDPrefix="team-role"
      />
      <Text variant="bodySm" tone="muted">
        {c.team.roleHints[value]}
      </Text>
    </View>
  );
}

function CreateStaffCard() {
  const c = getCopy();
  const create = useCreateStaff();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("operator");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function submit() {
    setMessage(null);
    create.mutate(
      { full_name: name, username, password, role },
      {
        onSuccess: (r) => {
          setMessage({ ok: true, text: c.team.created(r.username) });
          setName("");
          setUsername("");
          setPassword("");
        },
        onError: (e) => setMessage({ ok: false, text: errorText(e, c.team.errors) }),
      },
    );
  }

  return (
    <Card>
      <Text variant="eyebrow" tone="accent">
        {c.team.add}
      </Text>
      <Field label={c.team.name} value={name} onChangeText={setName} autoCapitalize="words" testID="team-name" />
      <Field
        label={c.team.username}
        hint={c.team.usernameHint}
        placeholder={c.team.usernameHint}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        testID="team-username"
      />
      {/* Visible a propósito: el dueño se la entrega a la persona. */}
      <Field
        label={c.team.password}
        hint={c.team.passwordHint}
        placeholder={c.team.passwordHint}
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoCorrect={false}
        testID="team-password"
      />
      <RoleChips value={role} onChange={setRole} />
      {message ? (
        <Text variant="bodySm" style={{ color: message.ok ? status.success : status.danger }} accessibilityRole="alert" testID="team-message">
          {message.text}
        </Text>
      ) : null}
      <Button label={c.team.create} loading={create.isPending} onPress={submit} testID="team-create" />
    </Card>
  );
}

function StaffCard({ member }: { member: StaffMember }) {
  const c = getCopy();
  const locale = currentLocale();
  const update = useUpdateStaff();
  const setPw = useSetStaffPassword();
  const [editingPw, setEditingPw] = useState(false);
  const [pw, setPwValue] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const active = member.status === "active";
  const fail = (e: unknown) => setMessage({ ok: false, text: errorText(e, c.team.errors) });
  const other: StaffRole = member.role === "lobby" ? "operator" : "lobby";

  return (
    <Card style={!active ? { opacity: 0.7 } : undefined} testID={`team-member-${member.username}`}>
      <Text variant="displaySm">{member.full_name ?? member.username}</Text>
      <Text tone="muted">{`${c.team.username}: ${member.username}`}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        <StatusBadge label={c.team.roles[member.role]} icon={member.role === "lobby" ? ShieldCheck : Wrench} tone="neutral" />
        <StatusBadge label={active ? c.team.active : c.team.disabled} icon={UserRound} tone={active ? "success" : "danger"} />
      </View>
      <Text variant="bodySm" tone="muted">
        {member.last_sign_in_at
          ? c.team.lastSeen(`${formatDateLong(member.last_sign_in_at, locale)} · ${formatTime(member.last_sign_in_at, locale)}`)
          : c.team.never}
      </Text>

      {message ? (
        <Text variant="bodySm" style={{ color: message.ok ? status.success : status.danger }} accessibilityRole="alert">
          {message.text}
        </Text>
      ) : null}

      {editingPw ? (
        <View style={{ gap: space.sm }}>
          <Field label={c.team.newPassword} hint={c.team.passwordHint} value={pw} onChangeText={setPwValue} autoCapitalize="none" autoCorrect={false} />
          <Button
            label={c.team.savePassword}
            loading={setPw.isPending}
            onPress={() =>
              setPw.mutate(
                { id: member.id, password: pw },
                {
                  onSuccess: () => {
                    setMessage({ ok: true, text: c.team.passwordSaved });
                    setEditingPw(false);
                    setPwValue("");
                  },
                  onError: fail,
                },
              )
            }
          />
        </View>
      ) : null}

      <View style={{ gap: space.xs }}>
        {active ? (
          <Button
            variant="ghost"
            label={other === "lobby" ? c.team.makeLobby : c.team.makeOperator}
            disabled={update.isPending}
            onPress={() => update.mutate({ id: member.id, role: other }, { onError: fail })}
          />
        ) : null}
        {member.internal && !editingPw ? (
          <Button variant="ghost" label={c.team.resetPassword} onPress={() => setEditingPw(true)} />
        ) : null}
        <Button
          variant="quiet"
          label={active ? c.team.disable : c.team.enable}
          disabled={update.isPending}
          onPress={() => update.mutate({ id: member.id, status: active ? "disabled" : "active" }, { onError: fail })}
          testID={`team-toggle-${member.username}`}
        />
      </View>
    </Card>
  );
}
