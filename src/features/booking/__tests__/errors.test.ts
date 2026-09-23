import { es } from "@/i18n/es";
import { BOOKING_ERROR_CODES, bookingErrorCode, bookingErrorMessage } from "../errors";

describe("errores de reservas", () => {
  it("reconoce el código que devuelve la BD en el mensaje de Supabase", () => {
    expect(bookingErrorCode({ message: "slot_taken", code: "P0001" })).toBe("slot_taken");
    expect(bookingErrorCode(new Error("too_many_active"))).toBe("too_many_active");
  });

  it("distingue problemas de red de errores desconocidos", () => {
    expect(bookingErrorCode(new Error("TypeError: Network request failed"))).toBe("network");
    expect(bookingErrorCode("algo raro")).toBe("generic");
  });

  it("cada código tiene un mensaje para la persona", () => {
    for (const code of BOOKING_ERROR_CODES) expect(es.errors[code]).toBeTruthy();
    expect(bookingErrorMessage({ message: "closed" }, es)).toBe(es.errors.closed);
  });
});
