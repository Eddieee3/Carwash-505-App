import { en } from "@/i18n/en";
import { es } from "@/i18n/es";
import type { RiskFactor } from "@/shared/database";
import { reportRange } from "../range";
import { riskFactorText } from "../risk";

describe("período del reporte (días del negocio, hasta hoy)", () => {
  it("últimos 7 y 30 días incluyen hoy", () => {
    expect(reportRange("last7", "2026-09-23")).toEqual({ from: "2026-09-17", to: "2026-09-23" });
    expect(reportRange("last30", "2026-09-23")).toEqual({ from: "2026-08-25", to: "2026-09-23" });
  });
  it("este mes y mes anterior (incluido el cambio de año y febrero bisiesto)", () => {
    expect(reportRange("thisMonth", "2026-09-23")).toEqual({ from: "2026-09-01", to: "2026-09-23" });
    expect(reportRange("lastMonth", "2026-09-23")).toEqual({ from: "2026-08-01", to: "2026-08-31" });
    expect(reportRange("lastMonth", "2027-01-05")).toEqual({ from: "2026-12-01", to: "2026-12-31" });
    expect(reportRange("lastMonth", "2028-03-10")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });
});

describe("motivos del riesgo de no-show (explicables)", () => {
  const f = (code: RiskFactor["code"], value: number | null = null): RiskFactor => ({ code, value, points: 10 });
  it("cada código tiene su texto, con su valor cuando aplica", () => {
    expect(riskFactorText(f("past_no_shows", 2), es)).toBe("2 no-show en los últimos 180 días");
    expect(riskFactorText(f("no_reply"), es)).toBe("No respondió al recordatorio");
    expect(riskFactorText(f("long_lead", 7), es)).toBe("Reservó con 7 días o más de anticipación");
    expect(riskFactorText(f("rain", 80), en)).toBe("Rain expected (80 %)");
    for (const code of ["first_visit", "late"] as const) expect(riskFactorText(f(code), es).length).toBeGreaterThan(3);
  });
});
