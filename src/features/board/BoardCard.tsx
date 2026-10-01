import { Camera, Clock, Hourglass, UserCheck, UserX } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { Button, Card, ChoiceChips, space, StatusBadge, Text } from "@/design";
import { STATUS_STYLE } from "@/features/booking/status";
import { currentLocale, getCopy } from "@/i18n";
import { formatTime } from "@/lib/time";
import type { AssignableStaff, BayRow, MediaPhase } from "@/shared/database";
import { nextActions, photoPhases, type BoardAction, type BoardRow } from "./model";

type Props = {
  row: BoardRow;
  userId: string | null;
  bays: BayRow[];
  busy: boolean;
  onAction: (row: BoardRow, action: BoardAction) => void;
  onMoveBay: (row: BoardRow, bayId: string) => void;
  onPhoto: (row: BoardRow, phase: MediaPhase) => void;
  /** Recepción (dueño y lobby): asignar a otra persona y cobrar. */
  frontDesk?: boolean;
  staff?: AssignableStaff[];
  onAssignTo?: (row: BoardRow, staffId: string) => void;
  onPay?: (row: BoardRow) => void;
};

const ATTENDANCE_STYLE = {
  attending: { tone: "success", icon: UserCheck },
  late: { tone: "warning", icon: Hourglass },
  no_reply: { tone: "danger", icon: UserX },
} as const;

const PRIMARY: BoardAction[] = ["checkIn", "start", "toQuality", "markReady", "deliver"];
const ACTIVE = ["confirmed", "checked_in", "in_progress", "quality_check", "ready"];

export function BoardCard({ row, userId, bays, busy, onAction, onMoveBay, onPhoto, frontDesk = false, staff = [], onAssignTo, onPay }: Props) {
  const c = getCopy();
  const locale = currentLocale();
  const style = STATUS_STYLE[row.status];
  const service = locale === "en" ? row.service_name_en : row.service_name_es;
  const vehicle = [row.vehicle_label ?? c.garage.kinds[row.vehicle_kind], row.plate].filter(Boolean).join(" · ");
  const actions = nextActions(row, userId);
  const sameKind = bays.filter((b) => b.kind === row.bay_kind);
  const canMove = sameKind.length > 1 && (row.status === "confirmed" || row.status === "checked_in");

  return (
    <Card>
      <View style={styles.top}>
        <Text variant="number">{`${formatTime(row.slot_start, locale)} – ${formatTime(row.slot_end, locale)}`}</Text>
        <StatusBadge label={c.status[row.status]} tone={style.tone} icon={style.icon} />
      </View>
      <Text variant="displaySm">{service}</Text>
      <Text>{row.customer_name ?? c.staff.customer}</Text>
      <Text tone="muted">{vehicle}</Text>
      <Text variant="bodySm" tone="muted">
        {`${c.staff.bay}: ${row.bay_name} · ${c.staff.assigned}: ${row.assigned_staff_name ?? c.staff.unassigned} · ${row.reference_code}`}
      </Text>

      {row.status === "confirmed" && (row.attendance || row.eta_at) ? (
        <View style={styles.badges}>
          {row.attendance ? (
            <StatusBadge
              label={c.staff.attendance[row.attendance]}
              tone={ATTENDANCE_STYLE[row.attendance].tone}
              icon={ATTENDANCE_STYLE[row.attendance].icon}
            />
          ) : null}
          {row.eta_at ? <StatusBadge label={c.staff.eta(formatTime(row.eta_at, locale))} tone="info" icon={Clock} /> : null}
        </View>
      ) : null}

      {photoPhases(row.status).length > 0 ? (
        <View style={styles.actions}>
          {row.media_count > 0 ? <StatusBadge label={c.staff.photoCount(row.media_count)} icon={Camera} /> : null}
          {photoPhases(row.status).map((phase) => (
            <Button
              key={phase}
              variant="quiet"
              label={c.photos.take[phase]}
              onPress={() => onPhoto(row, phase)}
              disabled={busy}
              testID={`board-photo-${phase}-${row.reference_code}`}
            />
          ))}
        </View>
      ) : null}

      {frontDesk && onAssignTo && ACTIVE.includes(row.status) && staff.length > 0 ? (
        <ChoiceChips
          label={c.staff.assignTo}
          options={staff.map((p) => ({ value: p.id, label: p.name }))}
          value={row.assigned_staff_id ?? ""}
          onChange={(id) => id !== row.assigned_staff_id && onAssignTo(row, id)}
          testIDPrefix={`board-assign-${row.reference_code}`}
        />
      ) : null}

      {frontDesk && onPay && row.status !== "cancelled" && row.status !== "no_show" ? (
        <View style={{ alignSelf: "flex-start" }}>
          <Button variant="ghost" label={c.payments.open} onPress={() => onPay(row)} disabled={busy} testID={`board-pay-${row.reference_code}`} />
        </View>
      ) : null}

      {canMove ? (
        <ChoiceChips
          label={c.staff.bay}
          options={sameKind.map((b) => ({ value: b.id, label: b.name }))}
          value={row.bay_id}
          onChange={(bayId) => bayId !== row.bay_id && onMoveBay(row, bayId)}
        />
      ) : null}

      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((a) => (
            <Button
              key={a}
              label={c.staff.actions[a]}
              variant={PRIMARY.includes(a) ? "primary" : a === "assignMe" ? "ghost" : "quiet"}
              onPress={() => onAction(row, a)}
              disabled={busy}
              testID={`board-${a}-${row.reference_code}`}
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
  actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.sm },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
