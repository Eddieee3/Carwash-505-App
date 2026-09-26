import { dayTone, monthOf, monthWeeks, shiftMonth, slotSummary, splitByPeriod } from "../calendar";

describe("calendario de reservas", () => {
  // Hoy: jueves 2026-09-24; se puede reservar hasta el 2026-10-07.
  const weeks = monthWeeks("2026-09-01", "2026-09-24", "2026-10-07");

  it("muestra el mes completo en semanas de lunes a domingo", () => {
    expect(weeks[0][0].day).toBe("2026-08-31");
    expect(weeks.at(-1)?.[6].day).toBe("2026-10-04");
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks.flat().filter((c) => c.inMonth)).toHaveLength(30);
  });

  it("solo son reservables los días desde hoy hasta el horizonte", () => {
    const cell = (d: string) => weeks.flat().find((c) => c.day === d);
    expect(cell("2026-09-23")?.inRange).toBe(false);
    expect(cell("2026-09-24")).toMatchObject({ inRange: true, isToday: true });
    expect(cell("2026-10-04")?.inRange).toBe(true);
    expect(monthWeeks("2026-10-01", "2026-09-24", "2026-10-07").flat().find((c) => c.day === "2026-10-08")?.inRange).toBe(false);
  });

  it("navega entre meses", () => {
    expect(monthOf("2026-09-24")).toBe("2026-09-01");
    expect(shiftMonth("2026-09-01", 1)).toBe("2026-10-01");
    expect(shiftMonth("2026-12-01", 1)).toBe("2027-01-01");
    expect(shiftMonth("2026-01-01", -1)).toBe("2025-12-01");
  });

  it("colorea cada día según los horarios libres", () => {
    expect(dayTone(0, 0)).toBe("closed");
    expect(dayTone(40, 0)).toBe("full");
    expect(dayTone(40, 5)).toBe("few");
    expect(dayTone(40, 30)).toBe("open");
  });

  it("separa mañana y tarde, y resume libres y reservados", () => {
    const hours = [7, 11, 12, 16];
    expect(splitByPeriod(hours, (h) => h)).toEqual({ morning: [7, 11], afternoon: [12, 16] });
    expect(slotSummary([{ free_bays: 2 }, { free_bays: 0 }, { free_bays: 1 }])).toEqual({ free: 2, booked: 1 });
  });
});
