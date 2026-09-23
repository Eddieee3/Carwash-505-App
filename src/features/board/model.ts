import type { BayKind, BookingRow, BookingStatus, MediaPhase, VehicleKind } from "@/shared/database";

/** Fila de staff_board(): lo que el personal necesita, sin teléfono ni correo del cliente. */
export type BoardRow = {
  id: string;
  reference_code: string;
  status: BookingStatus;
  slot_start: string;
  slot_end: string;
  bay_id: string;
  bay_name: string;
  bay_kind: BayKind;
  service_name_es: string;
  service_name_en: string;
  customer_name: string | null;
  vehicle_kind: VehicleKind;
  vehicle_label: string | null;
  plate: string | null;
  assigned_staff_id: string | null;
  assigned_staff_name: string | null;
  checked_in_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  attendance: BookingRow["attendance"];
  eta_at: string | null;
  media_count: number;
};

/** Qué fotos tiene sentido tomar en cada estado (antes al recibir, después al terminar, daños al revisar). */
export function photoPhases(status: BookingStatus): MediaPhase[] {
  switch (status) {
    case "confirmed":
    case "checked_in":
      return ["before", "damage"];
    case "in_progress":
      return ["before", "after", "damage"];
    case "completed":
      return ["after"];
    default:
      return [];
  }
}

export const BOARD_GROUPS = {
  incoming: ["confirmed", "checked_in"],
  active: ["in_progress"],
  done: ["completed"],
  closed: ["cancelled", "no_show"],
} as const satisfies Record<string, readonly BookingStatus[]>;
export type BoardGroup = keyof typeof BOARD_GROUPS;

export function groupBoard(rows: BoardRow[]): Record<BoardGroup, BoardRow[]> {
  const out: Record<BoardGroup, BoardRow[]> = { incoming: [], active: [], done: [], closed: [] };
  for (const row of rows) {
    const group = (Object.keys(BOARD_GROUPS) as BoardGroup[]).find((g) =>
      (BOARD_GROUPS[g] as readonly BookingStatus[]).includes(row.status),
    );
    if (group) out[group].push(row);
  }
  return out;
}

export type BoardAction = "checkIn" | "start" | "finish" | "noShow" | "cancel" | "assignMe";

/** Acciones válidas para una reserva (espejo de advance_booking/cancel_booking; la BD decide al final). */
export function nextActions(row: BoardRow, userId: string | null, now: Date = new Date()): BoardAction[] {
  const actions: BoardAction[] = [];
  const started = now.getTime() >= new Date(row.slot_start).getTime();
  switch (row.status) {
    case "confirmed":
      actions.push("checkIn");
      if (started) actions.push("noShow");
      actions.push("cancel");
      break;
    case "checked_in":
      actions.push("start", "cancel");
      break;
    case "in_progress":
      actions.push("finish");
      break;
    default:
      break;
  }
  const active = row.status === "confirmed" || row.status === "checked_in" || row.status === "in_progress";
  if (active && userId !== null && row.assigned_staff_id !== userId) actions.push("assignMe");
  return actions;
}
