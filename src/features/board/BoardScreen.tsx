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
import { useBays, useBoardAction, useBookingsRealtime, useStaffBoard } from "./api";
import { BoardCard } from "./BoardCard";
import { BOARD_GROUPS, groupBoard, type BoardAction, type BoardGroup, type BoardRow } from "./model";

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
  const [group, setGroup] = useState<BoardGroup>("incoming");
  const grouped = groupBoard(board.data ?? []);

  const fail = (error: unknown) => Alert.alert(bookingErrorMessage(error, c));

  function run(row: BoardRow, a: BoardAction) {
    const exec = () => action.mutate({ id: row.id, action: a }, { onError: fail });
    if (a === "noShow" || a === "cancel") {
      Alert.alert(a === "noShow" ? c.staff.noShowTitle : c.staff.cancelTitle, row.customer_name ?? undefined, [
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
              onPhoto={(r, phase) =>
                photo.mutate(
                  { bookingId: r.id, phase, source: "camera" },
                  {
                    onError: (e) =>
                      Alert.alert(e instanceof Error && e.message === "permission_denied" ? c.photos.permission : bookingErrorMessage(e, c)),
                  },
                )
              }
              onMoveBay={(r, bayId) => action.mutate({ id: r.id, action: "moveBay", bayId }, { onError: fail })}
            />
          ))}
        </View>
      )}

      {withSignOut ? <Button variant="quiet" label={c.common.signOut} onPress={signOut} /> : null}
    </Screen>
  );
}
