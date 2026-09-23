import type { Copy } from "@/i18n";
import type { RiskFactor } from "@/shared/database";

/** Motivo legible de cada punto del riesgo de no-show (el servidor decide los puntos; aquí solo se explican). */
export function riskFactorText(f: RiskFactor, c: Copy): string {
  const t = c.risk.factors;
  switch (f.code) {
    case "past_no_shows":
      return t.past_no_shows(f.value ?? 0);
    case "first_visit":
      return t.first_visit;
    case "no_reply":
      return t.no_reply;
    case "late":
      return t.late;
    case "long_lead":
      return t.long_lead(f.value ?? 0);
    case "rain":
      return t.rain(f.value ?? 0);
  }
}
