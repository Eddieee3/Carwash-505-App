import { router } from "expo-router";
import { ClipboardList, Radio } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { Button, ChoiceChips, EmptyState, Eyebrow, palette, Screen, space, StatusBadge, Text } from "@/design";
import { useAuth } from "@/features/auth/AuthProvider";
import { bookingErrorMessage } from "@/features/booking/errors";
import { useUploadBookingPhoto } from "@/features/evidence/api";
import { getCopy } from "@/i18n";
import { localDate } from "@/lib/time";
import type { MediaPhase } from "@/shared/database";
import { useAssignableStaff, useBays, useBoardAction, useBookingsRealtime, useStaffBoard } from "./api";
import { BoardCard } from "./BoardCard";
import { BOARD_GROUPS, groupBoard, type BoardAction, type BoardGroup, type BoardRow } from "./model";
import { PaymentSheet, PromptSheet } from "./sheets";

/** Tablero del día en vivo. Lo usan el colaborador ("Hoy") y el propietario (pestaña "Hoy"). */
export function BoardScreen({ eyebrow, withSignOut = false }: { eyebrow: string; withSignOut?: boolean }) {
  const c = getCopy();
  const { session, signOut, view } = useAuth();
  // Escanear y cobrar es de recepción (dueño y admin del lobby); los colaboradores solo ven y avanzan los carros.
  const canScan = view === "lobby" || view === "owner";
  const userId = session?.user.id ?? null;
  useBookingsRealtime();

  const board = useStaffBoard(localDate());
  const bays = useBays();
  const action = useBoardAction();
  const photo = useUploadBookingPhoto();
  const staff = useAssignableStaff(canScan);
  const [group, setGroup] = useState<BoardGroup>("incoming");
  // Hojas: motivo de cancelación (O04), nota de daño (O05) y cobro (E01).
  const [cancelRow, setCancelRow] = useState<BoardRow | null>(null);
  const [damageRow, setDamageRow] = useState<BoardRow | null>(null);
  const [payRow, setPayRow] = useState<BoardRow | null>(null);
  const grouped = groupBoard(board.data ?? []);

  const fail = (error: unknown) => Alert.alert(bookingErrorMessage(error, c));

  function takePhoto(r: BoardRow, phase: MediaPhase, note?: string) {
    photo.mutate(
      { bookingId: r.id, phase, source: "camera", note },
      {
        onError: (e) => Alert.alert(e instanceof Error && e.message === "permission_denied" ? c.photos.permission : bookingErrorMessage(e, c)),
      },
    );
  }

  function run(row: BoardRow, a: BoardAction) {
    const exec = () => action.mutate({ id: row.id, action: a }, { onError: fail });
    if (a === "cancel") {
      setCancelRow(row);
    } else if (a === "noShow") {
      Alert.alert(c.staff.noShowTitle, row.customer_name ?? undefined, [
        { text: c.common.no, style: "cancel" },
        { text: c.common.yes, style: "destructive", onPress: exec },
      ]);
    } else {
      exec();
    }
  }

  const rows = grouped[group];

  return (
    <Screen edges={["top"]}>
      <View style={{ gap: space.sm }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text variant="displayLg">{c.staff.title}</Text>
          <StatusBadge label={c.staff.live} tone="info" icon={Radio} />
        </View>
      </View>

      {canScan ? <Button variant="ghost" label={c.scan.open} onPress={() => router.push("/scan")} testID="board-scan" /> : null}
      <Button variant="ghost" label={c.ops.open} onPress={() => router.push("/operations")} testID="board-operations" />

      <ChoiceChips
        label={c.staff.title}
        value={group}
        onChange={setGroup}
        options={(Object.keys(BOARD_GROUPS) as BoardGroup[]).map((g) => ({
          value: g,
          label: `${c.staff.groups[g]} · ${grouped[g].length}`,
        }))}
        testIDPrefix="board-group"
      />

      {board.isLoading ? (
        <ActivityIndicator color={palette.cyan} />
      ) : board.isError ? (
        <EmptyState title={c.errors.generic} action={{ label: c.common.retry, onPress: () => board.refetch() }} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title={c.staff.empty} />
      ) : (
        <View style={{ gap: space.md }}>
          {rows.map((row) => (
            <BoardCard
              key={row.id}
              row={row}
              userId={userId}
              bays={bays.data ?? []}
              busy={action.isPending || photo.isPending}
              onAction={run}
              onPhoto={(r, phase) => (phase === "damage" ? setDamageRow(r) : takePhoto(r, phase))}
              onMoveBay={(r, bayId) => action.mutate({ id: r.id, action: "moveBay", bayId }, { onError: fail })}
              frontDesk={canScan}
              staff={staff.data ?? []}
              onAssignTo={(r, staffId) => action.mutate({ id: r.id, action: "assignTo", staffId }, { onError: fail })}
              onPay={setPayRow}
            />
          ))}
        </View>
      )}

      <PromptSheet
        visible={!!cancelRow}
        title={c.staff.cancelTitle}
        body={cancelRow ? [cancelRow.customer_name, cancelRow.reference_code].filter(Boolean).join(" · ") : undefined}
        label={c.staff.cancelReason}
        confirmLabel={c.staff.actions.cancel}
        minLength={3}
        destructive
        busy={action.isPending}
        onCancel={() => setCancelRow(null)}
        onConfirm={(reason) => {
          if (!cancelRow) return;
          action.mutate({ id: cancelRow.id, action: "cancel", reason }, { onSuccess: () => setCancelRow(null), onError: fail });
        }}
      />
      <PromptSheet
        visible={!!damageRow}
        title={c.photos.take.damage}
        body={c.staff.damageHint}
        label={c.staff.damageNote}
        confirmLabel={c.staff.damageTakePhoto}
        onCancel={() => setDamageRow(null)}
        onConfirm={(note) => {
          if (damageRow) takePhoto(damageRow, "damage", note);
          setDamageRow(null);
        }}
      />
      <PaymentSheet
        bookingId={payRow?.id ?? null}
        title={payRow ? `${c.payments.title} · ${payRow.reference_code}` : c.payments.title}
        onClose={() => setPayRow(null)}
      />

      {withSignOut ? <Button variant="quiet" label={c.common.signOut} onPress={signOut} /> : null}
    </Screen>
  );
}
