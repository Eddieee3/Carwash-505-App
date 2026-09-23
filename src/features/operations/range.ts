import { addDays } from "@/lib/time";

export const REPORT_PERIODS = ["last7", "last30", "thisMonth", "lastMonth"] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

/** Período del reporte en días del negocio ("YYYY-MM-DD"), siempre hasta hoy como máximo. */
export function reportRange(period: ReportPeriod, today: string): { from: string; to: string } {
  const [y, m] = today.split("-").map(Number);
  const firstOfMonth = `${today.slice(0, 7)}-01`;
  switch (period) {
    case "last7":
      return { from: addDays(today, -6), to: today };
    case "last30":
      return { from: addDays(today, -29), to: today };
    case "thisMonth":
      return { from: firstOfMonth, to: today };
    case "lastMonth": {
      const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
      return { from: `${prev}-01`, to: addDays(firstOfMonth, -1) };
    }
  }
}
