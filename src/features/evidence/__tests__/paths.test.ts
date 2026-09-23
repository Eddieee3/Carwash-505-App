import { bookingMediaPath, ticketMediaPath } from "../paths";

// Mismas expresiones que los CHECK de booking_media y ticket_media (migración 9).
const DB_BOOKING = /^bookings\/[0-9a-f-]{36}\/(before|after|damage)\/[A-Za-z0-9_-]{1,64}\.(jpg|jpeg|png|webp)$/;
const DB_TICKET = /^tickets\/[0-9a-f-]{36}\/[A-Za-z0-9_-]{1,64}\.(jpg|jpeg|png|webp)$/;
const ID = "7f3c9a2e-1111-4a11-8a11-000000000001";
const FILE = "0b8e2f7a-2222-4b22-9b22-000000000002";

describe("rutas de evidencia en el bucket privado", () => {
  it("coinciden con lo que exige la base de datos", () => {
    for (const phase of ["before", "after", "damage"] as const) {
      const path = bookingMediaPath(ID, phase, FILE);
      expect(path).toMatch(DB_BOOKING);
      expect(path.split("/")[1]).toBe(ID); // la BD exige que la carpeta sea la reserva
    }
    expect(ticketMediaPath(ID, FILE)).toMatch(DB_TICKET);
  });

  it("rechaza nombres de archivo que permitirían salir de la carpeta", () => {
    expect(() => bookingMediaPath(ID, "before", "../otro")).toThrow("invalid_file_id");
    expect(() => ticketMediaPath(ID, "a/b")).toThrow("invalid_file_id");
  });
});
