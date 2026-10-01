import type { BookingStatus } from "@/shared/database";
import { groupBoard, nextActions, photoPhases, todayOverview, type BoardRow } from "../model";

describe("fotos del servicio según el estado", () => {
  it("antes y daños al recibir, después al terminar, nada si se canceló", () => {
    expect(photoPhases("confirmed")).toEqual(["before", "damage"]);
    expect(photoPhases("in_progress")).toEqual(["before", "after", "damage"]);
    expect(photoPhases("quality_check")).toEqual(["after", "damage"]);
    expect(photoPhases("ready")).toEqual(["after"]);
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
    const g = groupBoard(
      ["confirmed", "checked_in", "in_progress", "quality_check", "ready", "completed", "cancelled", "no_show"].map((s) => row(s as BookingStatus)),
    );
    expect(g.incoming.map((r) => r.status)).toEqual(["confirmed", "checked_in"]);
    expect(g.active.map((r) => r.status)).toEqual(["in_progress", "quality_check", "ready"]);
    expect(g.done.map((r) => r.status)).toEqual(["completed"]);
    expect(g.closed.map((r) => r.status)).toEqual(["cancelled", "no_show"]);
  });

  it("solo ofrece transiciones válidas; 'no asistió' recién a la hora de la cita", () => {
    const before = new Date("2026-09-24T14:59:00Z");
    const after = new Date("2026-09-24T15:01:00Z");
    expect(nextActions(row("confirmed"), ME, before)).toEqual(["checkIn", "cancel", "assignMe"]);
    expect(nextActions(row("confirmed"), ME, after)).toEqual(["checkIn", "noShow", "cancel", "assignMe"]);
    expect(nextActions(row("checked_in"), ME, after)).toEqual(["start", "cancel", "assignMe"]);
    // O03: En proceso → Control de calidad → Lista → Entregada (y volver a proceso desde Control de calidad).
    expect(nextActions(row("in_progress", { assigned_staff_id: ME }), ME, after)).toEqual(["toQuality"]);
    expect(nextActions(row("quality_check", { assigned_staff_id: ME }), ME, after)).toEqual(["markReady", "backToProcess"]);
    expect(nextActions(row("ready", { assigned_staff_id: ME }), ME, after)).toEqual(["deliver"]);
    expect(nextActions(row("ready"), ME, after)).toEqual(["deliver", "assignMe"]);
    for (const s of ["completed", "cancelled", "no_show"] as const) expect(nextActions(row(s), ME, after)).toEqual([]);
  });
});

describe("resumen de hoy (dashboard)", () => {
  it("cuenta citas, en proceso, bahías libres por tipo, próxima llegada y sin responsable", () => {
    const now = new Date("2026-09-24T15:10:00Z");
    const rows = [
      row("in_progress", { id: "a", bay_id: "w1", assigned_staff_id: ME }),
      row("quality_check", { id: "b", bay_id: "w2" }),
      row("confirmed", { id: "c", bay_id: "w3", slot_start: "2026-09-24T16:00:00Z", slot_end: "2026-09-24T16:30:00Z" }),
      row("confirmed", { id: "d", bay_id: "w4", slot_start: "2026-09-24T15:45:00Z", slot_end: "2026-09-24T16:15:00Z" }),
      row("cancelled", { id: "e", bay_id: "w5" }),
      row("completed", { id: "f", bay_id: "d1" }),
    ];
    const bays = [
      { id: "w1", kind: "wash" as const },
      { id: "w2", kind: "wash" as const },
      { id: "w3", kind: "wash" as const },
      { id: "d1", kind: "detail" as const },
    ];
    const o = todayOverview(rows, bays, now);
    expect(o).toMatchObject({ bookings: 5, working: 2, unassigned: 3, delivered: 1 });
    expect(o.next?.id).toBe("d");
    expect(o.freeBays).toEqual([
      { kind: "wash", total: 3, free: 1 },
      { kind: "detail", total: 1, free: 1 },
    ]);
  });
});
