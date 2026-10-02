import { ChevronRight, ShieldCheck, UserRound, Wrench } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Alert } from "@/lib/alert";
import { Button, Card, ChoiceChips, EmptyState, Eyebrow, Field, palette, Screen, space, status, StatusBadge, Text, touch, useTheme } from "@/design";
import { Sheet } from "@/features/board/sheets";
import { TasksSection } from "@/features/operations/OperationsScreen";
import { useCreateStaff, useSetStaffPassword, useTeam, useUpdateStaff, type StaffRole } from "@/features/team/api";
import { currentLocale, getCopy } from "@/i18n";
import { formatDateLong, formatTime } from "@/lib/time";
import type { StaffMember } from "@/shared/database";

const errorText = (e: unknown, errors: Record<string, string>) => {
  const code = e instanceof Error ? e.message : "";
  return errors[Object.keys(errors).find((k) => code.includes(k)) ?? "generic"];
};

/**
 * Dueño · Equipo (A03/A05): lista compacta del personal (nombre, rol, estado y último acceso) y tareas del equipo.
 * Cambiar rol, contraseña o desactivar se hace en "Administrar", con la consecuencia explicada y confirmación.
 * Los permisos los vuelve a validar el servidor (owner_update_staff y la Edge Function staff-users).
 */
export default function Team() {
  const c = getCopy();
  const team = useTeam();
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<StaffMember | null>(null);

  return (
    <Screen edges={["top"]}>
      <View style={{ gap: space.sm }}>
        <Eyebrow>{c.owner.eyebrow}</Eyebrow>
        <Text variant="displayLg">{c.team.title}</Text>
        <Text tone="muted">{c.team.intro}</Text>
      </View>

      <Card style={{ gap: 0, paddingVertical: space.xs }}>
        {team.isLoading ? (
          <ActivityIndicator color={palette.cyan} accessibilityLabel={c.common.loading} />
        ) : team.isError ? (
          <EmptyState title={c.errors.generic} action={{ label: c.common.retry, onPress: () => team.refetch() }} />
        ) : (team.data ?? []).length === 0 ? (
          <Text tone="muted" style={{ paddingVertical: space.sm }}>
            {c.team.empty}
          </Text>
        ) : (
          team.data!.map((m) => <StaffRow key={m.id} member={m} onPress={() => setSelected(m)} />)
        )}
      </Card>
      <View style={{ alignSelf: "flex-start" }}>
        <Button variant="ghost" label={c.team.add} onPress={() => setAdding(true)} testID="team-add" />
      </View>

      <TasksSection />

      <Sheet visible={adding} title={c.team.add} onClose={() => setAdding(false)}>
        <CreateStaffForm />
      </Sheet>
      <Sheet visible={!!selected} title={selected ? (selected.full_name ?? selected.username) : ""} onClose={() => setSelected(null)}>
        {selected ? <ManageStaff member={(team.data ?? []).find((m) => m.id === selected.id) ?? selected} /> : null}
      </Sheet>
    </Screen>
  );
}

function StaffRow({ member, onPress }: { member: StaffMember; onPress: () => void }) {
  const c = getCopy();
  const locale = currentLocale();
  const theme = useTheme();
  const active = member.status === "active";
  const seen = member.last_sign_in_at ? `${formatDateLong(member.last_sign_in_at, locale)} · ${formatTime(member.last_sign_in_at, locale)}` : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[member.full_name ?? member.username, c.team.roles[member.role], active ? c.team.active : c.team.disabled, c.team.manage].join(", ")}
      onPress={onPress}
      style={[styles.row, !active && { opacity: 0.65 }]}
      testID={`team-member-${member.username}`}
    >
      {member.role === "lobby" ? <ShieldCheck size={20} color={theme.accent} /> : <Wrench size={20} color={theme.accent} />}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="label">{member.full_name ?? member.username}</Text>
        <Text variant="bodySm" tone="muted">
          {[c.team.roles[member.role], active ? c.team.active : c.team.disabled, seen ? c.team.lastSeen(seen) : c.team.never].join(" · ")}
        </Text>
      </View>
      <Text variant="bodySm" style={{ color: theme.accent }}>
        {c.team.manage}
      </Text>
      <ChevronRight size={18} color={theme.fgMuted} />
    </Pressable>
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

function CreateStaffForm() {
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
    <>
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
    </>
  );
}

/** "Administrar": cada acción sensible explica su consecuencia y pide confirmación. */
function ManageStaff({ member }: { member: StaffMember }) {
  const c = getCopy();
  const update = useUpdateStaff();
  const setPw = useSetStaffPassword();
  const [editingPw, setEditingPw] = useState(false);
  const [pw, setPwValue] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const active = member.status === "active";
  const fail = (e: unknown) => setMessage({ ok: false, text: errorText(e, c.team.errors) });
  const other: StaffRole = member.role === "lobby" ? "operator" : "lobby";

  const confirm = (title: string, body: string, run: () => void) =>
    Alert.alert(title, body, [
      { text: c.common.no, style: "cancel" },
      { text: c.common.yes, style: "destructive", onPress: run },
    ]);

  return (
    <>
      <Text tone="muted">{`${c.team.username}: ${member.username}`}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        <StatusBadge label={c.team.roles[member.role]} icon={member.role === "lobby" ? ShieldCheck : Wrench} tone="neutral" />
        <StatusBadge label={active ? c.team.active : c.team.disabled} icon={UserRound} tone={active ? "success" : "danger"} />
      </View>

      {message ? (
        <Text variant="bodySm" style={{ color: message.ok ? status.success : status.danger }} accessibilityRole="alert">
          {message.text}
        </Text>
      ) : null}

      {active ? (
        <View style={{ gap: space.xs }}>
          <Text variant="label">{c.team.role}</Text>
          <Text variant="bodySm" tone="muted">
            {c.team.roleHints[other]}
          </Text>
          <Button
            variant="ghost"
            label={other === "lobby" ? c.team.makeLobby : c.team.makeOperator}
            disabled={update.isPending}
            onPress={() =>
              confirm(c.team.confirmRoleTitle(c.team.roles[other]), c.team.roleHints[other], () =>
                update.mutate({ id: member.id, role: other }, { onSuccess: () => setMessage({ ok: true, text: c.team.saved }), onError: fail }),
              )
            }
          />
        </View>
      ) : null}

      {member.internal ? (
        editingPw ? (
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
        ) : (
          <Button variant="ghost" label={c.team.resetPassword} onPress={() => setEditingPw(true)} />
        )
      ) : null}

      <Text variant="bodySm" tone="muted">
        {active ? c.team.disableConsequence : c.team.enableConsequence}
      </Text>
      <Button
        variant="quiet"
        label={active ? c.team.disable : c.team.enable}
        disabled={update.isPending}
        onPress={() =>
          confirm(active ? c.team.confirmDisable : c.team.confirmEnable, active ? c.team.disableConsequence : c.team.enableConsequence, () =>
            update.mutate(
              { id: member.id, status: active ? "disabled" : "active" },
              { onSuccess: () => setMessage({ ok: true, text: c.team.saved }), onError: fail },
            ),
          )
        }
        testID={`team-toggle-${member.username}`}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: touch.min + 12, flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.sm },
});
