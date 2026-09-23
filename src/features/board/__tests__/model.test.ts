import type { BookingStatus } from "@/shared/database";
import { groupBoard, nextActions, photoPhases, type BoardRow } from "../model";

describe("fotos del servicio según el estado", () => {
  it("antes y daños al recibir, después al terminar, nada si se canceló", () => {
    expect(photoPhases("confirmed")).toEqual(["before", "damage"]);
    expect(photoPhases("in_progress")).toEqual(["before", "after", "damage"]);
    expect(photoPhases("completed")).toEqual(["after"]);
    expect(photoPhases("cancelled")).toEqual([]);
    expect(photoPhases("no_show")).toEqual([]);
  });
});

const ME = "00000000-0000-4000-8000-000000000005";
const START = "2026-09-24T15:00:00Z";

const row = (status: BookingStatus, over: Partial<BoardRow> = {}): BoardRow => ({
  id: status,
  reference_code: "CW505-260924-ABCD",
  status,
  slot_start: START,
  slot_end: "2026-09-24T15:30:00Z",
  bay_id: "b1",
  bay_name: "Bahía 1",
  bay_kind: "wash",
  service_name_es: "Lavado",
  service_name_en: "Wash",
  customer_name: "Ana",
  vehicle_kind: "car",
  vehicle_label: "Toyota Yaris",
  plate: "M 111-111",
  assigned_staff_id: null,
  assigned_staff_name: null,
  checked_in_at: null,
  started_at: null,
  finished_at: null,
  attendance: null,
  eta_at: null,
  media_count: 0,
  ...over,
});

describe("tablero del personal", () => {
  it("agrupa por columna del Kanban", () => {
    const g = groupBoard(["confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"].map((s) => row(s as BookingStatus)));
    expect(g.incoming.map((r) => r.status)).toEqual(["confirmed", "checked_in"]);
    expect(g.active.map((r) => r.status)).toEqual(["in_progress"]);
    expect(g.done.map((r) => r.status)).toEqual(["completed"]);
    expect(g.closed.map((r) => r.status)).toEqual(["cancelled", "no_show"]);
  });

  it("solo ofrece transiciones válidas; 'no asistió' recién a la hora de la cita", () => {
    const before = new Date("2026-09-24T14:59:00Z");
    const after = new Date("2026-09-24T15:01:00Z");
    expect(nextActions(row("confirmed"), ME, before)).toEqual(["checkIn", "cancel", "assignMe"]);
    expect(nextActions(row("confirmed"), ME, after)).toEqual(["checkIn", "noShow", "cancel", "assignMe"]);
    expect(nextActions(row("checked_in"), ME, after)).toEqual(["start", "cancel", "assignMe"]);
    expect(nextActions(row("in_progress", { assigned_staff_id: ME }), ME, after)).toEqual(["finish"]);
    for (const s of ["completed", "cancelled", "no_show"] as const) expect(nextActions(row(s), ME, after)).toEqual([]);
  });
});
