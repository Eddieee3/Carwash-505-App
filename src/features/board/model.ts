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
    case "quality_check":
      return ["after", "damage"];
    case "ready":
    case "completed":
      return ["after"];
    default:
      return [];
  }
}

export const BOARD_GROUPS = {
  incoming: ["confirmed", "checked_in"],
  active: ["in_progress", "quality_check", "ready"],
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

export type BoardAction = "checkIn" | "start" | "toQuality" | "backToProcess" | "markReady" | "deliver" | "noShow" | "cancel" | "assignMe";

/** Estado al que lleva cada acción de avance (O03: Llegó → En proceso → Control de calidad → Lista → Entregada). */
export const ACTION_TO_STATUS: Partial<Record<BoardAction, BookingStatus>> = {
  checkIn: "checked_in",
  start: "in_progress",
  toQuality: "quality_check",
  backToProcess: "in_progress",
  markReady: "ready",
  deliver: "completed",
  noShow: "no_show",
};

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
      actions.push("toQuality");
      break;
    case "quality_check":
      actions.push("markReady", "backToProcess");
      break;
    case "ready":
      actions.push("deliver");
      break;
    default:
      break;
  }
  const active = (["confirmed", "checked_in", "in_progress", "quality_check", "ready"] as BookingStatus[]).includes(row.status);
  if (active && userId !== null && row.assigned_staff_id !== userId) actions.push("assignMe");
  return actions;
}

const WORKING: BookingStatus[] = ["in_progress", "quality_check", "ready"];
const OCCUPYING: BookingStatus[] = ["confirmed", "checked_in", "in_progress", "quality_check", "ready"];

export type TodayOverview = {
  /** Citas del día que siguen en pie (sin canceladas ni no-show). */
  bookings: number;
  /** Vehículos en proceso, en control de calidad o listos para entregar. */
  working: number;
  /** Bahías libres en este momento, por tipo (solo los tipos con bahías activas). */
  freeBays: { kind: BayKind; free: number; total: number }[];
  /** Próxima llegada (confirmada, aún no empieza). */
  next: BoardRow | null;
  /** Reservas activas sin responsable asignado. */
  unassigned: number;
  delivered: number;
};

/** A01: lo primero que necesita el dueño para operar hoy, calculado del tablero en vivo y de las bahías activas. */
export function todayOverview(rows: BoardRow[], bays: { id: string; kind: BayKind }[], now: Date = new Date()): TodayOverview {
  const t = now.getTime();
  const busyNow = new Set(
    rows
      .filter((r) => OCCUPYING.includes(r.status) && new Date(r.slot_start).getTime() <= t && new Date(r.slot_end).getTime() > t)
      .map((r) => r.bay_id),
  );
  const kinds: BayKind[] = ["wash", "interior", "detail", "cabin"];
  const freeBays = kinds
    .map((kind) => {
      const ofKind = bays.filter((b) => b.kind === kind);
      return { kind, total: ofKind.length, free: ofKind.filter((b) => !busyNow.has(b.id)).length };
    })
    .filter((k) => k.total > 0);
  const upcoming = rows
    .filter((r) => r.status === "confirmed" && new Date(r.slot_start).getTime() >= t)
    .sort((a, b) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime());
  return {
    bookings: rows.filter((r) => r.status !== "cancelled" && r.status !== "no_show").length,
    working: rows.filter((r) => WORKING.includes(r.status)).length,
    freeBays,
    next: upcoming[0] ?? null,
    unassigned: rows.filter((r) => OCCUPYING.includes(r.status) && !r.assigned_staff_id).length,
    delivered: rows.filter((r) => r.status === "completed").length,
  };
}
