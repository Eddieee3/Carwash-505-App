import { en } from "@/i18n/en";
import { es } from "@/i18n/es";
import type { PriceSnapshot } from "@/shared/database";
import { breakdown, formatPct, parseBirthday } from "../breakdown";

const c = es;
const base: PriceSnapshot = {
  vehicle_kind: "car",
  amount: 112,
  currency: "NIO",
  requires_evaluation: false,
  service_name_es: "Lavado",
  service_name_en: "Wash",
};

describe("desglose del precio (presenta el cálculo del servidor, no lo recalcula)", () => {
  it("reserva anterior a la F5: solo servicio y total", () => {
    const b = breakdown({ ...base, amount: 100 }, "es", c);
    expect(b.lines.map((l) => l.key)).toEqual(["base"]);
    expect(b.total).toMatch(/100/);
  });

  it("reglas, tope, cupón, membresía y extras en orden, con signo y tono", () => {
    const b = breakdown(
      {
        ...base,
        base: 100,
        adjustments: [
          { kind: "peak", label_es: "Hora pico", label_en: "Peak", pct: 25 },
          { kind: "weather", label_es: "Lluvia", label_en: "Rain", pct: -15 },
        ],
        adjustment_pct: 10,
        cap_applied: true,
        offer: { id: "o", pct: 20, expires_at: "2026-10-01T00:00:00Z" },
        membership: { plan_code: "gold", name_es: "Gold", name_en: "Gold", pct: 10 },
        service_amount: 72,
        addons: [{ product_id: "w", name_es: "Cera", name_en: "Wax", price: 40 }],
        addons_total: 40,
      },
      "es",
      c,
    );
    expect(b.lines.map((l) => [l.key, l.value, l.tone])).toEqual([
      ["base", expect.stringMatching(/100/), "neutral"],
      ["adj-peak", "+25 %", "surcharge"],
      ["adj-weather", "−15 %", "discount"],
      ["cap", "+10 %", "surcharge"],
      ["offer", "−20 %", "discount"],
      ["membership", "−10 %", "discount"],
      ["addon-w", expect.stringMatching(/40/), "neutral"],
    ]);
    expect(b.lines.find((l) => l.key === "membership")?.label).toBe("Membresía Gold");
    expect(b.total).toMatch(/112/);
  });

  it("requiere evaluación: sin monto inventado", () => {
    const b = breakdown({ ...base, amount: null, requires_evaluation: true, base: null, adjustments: [] }, "en", en);
    expect(b.lines[0]).toMatchObject({ label: "Wash", value: "Price after assessment" });
    expect(b.total).toBe(en.book.priceToConfirm);
  });

  it("formatPct usa signo explícito", () => {
    expect(formatPct(5)).toBe("+5 %");
    expect(formatPct(-5)).toBe("−5 %");
  });
});

describe("cumpleaños AAAA-MM-DD", () => {
  it("acepta fechas reales, desde 1900 y no futuras", () => {
    expect(parseBirthday(" 1990-05-31 ", "2026-09-23")).toBe("1990-05-31");
    expect(parseBirthday("2000-02-29", "2026-09-23")).toBe("2000-02-29");
  });
  it("rechaza formato, días imposibles, antes de 1900 y futuras", () => {
    for (const bad of ["31/05/1990", "1990-5-31", "1990-02-30", "1899-12-31", "2026-09-24", ""]) {
      expect(parseBirthday(bad, "2026-09-23")).toBeNull();
    }
  });
});
