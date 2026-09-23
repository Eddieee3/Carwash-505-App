import { BUSINESS } from "@/shared/site";
import { addDays, closingTime, dayLabel, formatTime, localDate, nextDays, rangeEnd, weekday, zonedToUtc } from "../time";

describe("fechas en la zona del negocio (Managua, UTC-6)", () => {
  it("el día del negocio no es el día UTC después de las 6 p. m.", () => {
    expect(localDate(new Date("2026-09-23T05:30:00Z"))).toBe("2026-09-22");
    expect(localDate(new Date("2026-09-23T06:00:00Z"))).toBe("2026-09-23");
  });

  it("convierte una hora local de Managua a UTC", () => {
    expect(zonedToUtc("2026-09-24", "09:00").toISOString()).toBe("2026-09-24T15:00:00.000Z");
    expect(zonedToUtc("2026-12-31", "23:30").toISOString()).toBe("2027-01-01T05:30:00.000Z");
  });

  it("suma días cruzando meses y años", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(nextDays("2026-09-29", 3)).toEqual(["2026-09-29", "2026-09-30", "2026-10-01"]);
  });

  it("día de la semana con las mismas claves que el horario (0 = domingo)", () => {
    expect(weekday("2026-09-20")).toBe(0);
    expect(weekday("2026-09-21")).toBe(1);
  });

  it("hora de cierre según el horario publicado (domingo 17:00, lunes 18:00)", () => {
    expect(closingTime(BUSINESS.hours, "2026-09-20")?.toISOString()).toBe("2026-09-20T23:00:00.000Z");
    expect(closingTime(BUSINESS.hours, "2026-09-21")?.toISOString()).toBe("2026-09-22T00:00:00.000Z");
    expect(closingTime({ ...BUSINESS.hours, 0: null }, "2026-09-20")).toBeNull();
  });

  it("lee el fin del rango de una reserva tal como lo devuelve Postgres", () => {
    expect(rangeEnd('["2026-09-24 15:00:00+00","2026-09-24 15:30:00+00")')).toBe("2026-09-24T15:30:00.000Z");
    expect(rangeEnd("basura")).toBeNull();
  });

  it("etiquetas de día y hora", () => {
    const words = { today: "Hoy", tomorrow: "Mañana" };
    expect(dayLabel("2026-09-22", "2026-09-22", "es", words)).toBe("Hoy");
    expect(dayLabel("2026-09-23", "2026-09-22", "es", words)).toBe("Mañana");
    expect(dayLabel("2026-09-25", "2026-09-22", "es", words)).toMatch(/25/);
    expect(formatTime("2026-09-24T15:00:00Z", "es")).toMatch(/9:00/);
  });
});
