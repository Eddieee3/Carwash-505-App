import { addDays, weekday } from "@/lib/time";

export type CalendarCell = {
  day: string;
  /** Pertenece al mes que se está mostrando. */
  inMonth: boolean;
  /** Día reservable: desde hoy y dentro del horizonte de reservas. */
  inRange: boolean;
  isToday: boolean;
};

/** Disponibilidad de un día según available_days. */
export type DayTone = "open" | "few" | "full" | "closed";

/** Primer día (YYYY-MM-01) del mes de una fecha. */
export function monthOf(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10);
}

/** Semanas (lunes a domingo) que muestran el mes completo. */
export function monthWeeks(month: string, today: string, lastBookable: string): CalendarCell[][] {
  const first = monthOf(month);
  const last = addDays(shiftMonth(first, 1), -1);
  const start = addDays(first, -((weekday(first) + 6) % 7));
  const end = addDays(last, (7 - weekday(last)) % 7);
  const weeks: CalendarCell[][] = [];
  for (let day = start; day <= end; day = addDays(day, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(day, i);
        return { day: d, inMonth: d.slice(0, 7) === first.slice(0, 7), inRange: d >= today && d <= lastBookable, isToday: d === today };
      }),
    );
  }
  return weeks;
}

/** Verde: la mitad o más libre · Amarillo: quedan pocos · Rojo: lleno · Gris: sin horario ese día. */
export function dayTone(total: number, free: number): DayTone {
  if (total <= 0) return "closed";
  if (free <= 0) return "full";
  return free / total < 0.34 ? "few" : "open";
}

/** Separa las horas en mañana (antes de las 12:00) y tarde, según la hora local del negocio. */
export function splitByPeriod<T>(slots: T[], hourOf: (slot: T) => number): { morning: T[]; afternoon: T[] } {
  return {
    morning: slots.filter((s) => hourOf(s) < 12),
    afternoon: slots.filter((s) => hourOf(s) >= 12),
  };
}

/** Cuántos horarios quedan libres y cuántos ya están reservados (sin bahías libres). */
export function slotSummary(slots: { free_bays: number }[]): { free: number; booked: number } {
  const free = slots.filter((s) => s.free_bays > 0).length;
  return { free, booked: slots.length - free };
}
