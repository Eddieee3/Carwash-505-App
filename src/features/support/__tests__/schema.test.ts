import { ticketSchema } from "../schema";

const BOOKING = "7f3c9a2e-1111-4a11-8a11-000000000001";

describe("reporte de problema", () => {
  it("acepta un reporte con o sin reserva y recorta espacios", () => {
    expect(ticketSchema.parse({ kind: "pre_existing_damage", description: "  Rayón en la puerta  ", bookingId: BOOKING })).toEqual({
      kind: "pre_existing_damage",
      description: "Rayón en la puerta",
      bookingId: BOOKING,
    });
    expect(ticketSchema.safeParse({ kind: "other", description: "Consulta general", bookingId: null }).success).toBe(true);
  });

  it("mismos límites que la BD: 10 a 2000 caracteres y tipos conocidos", () => {
    expect(ticketSchema.safeParse({ kind: "complaint", description: "corto", bookingId: null }).error?.issues[0].message).toBe("too_short");
    expect(ticketSchema.safeParse({ kind: "complaint", description: "x".repeat(2001), bookingId: null }).error?.issues[0].message).toBe("too_long");
    expect(ticketSchema.safeParse({ kind: "refund", description: "Quiero mi dinero", bookingId: null }).success).toBe(false);
  });
});
