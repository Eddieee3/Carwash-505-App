import { intentFromResponse } from "../actions";

const BOOKING = "7f3c9a2e-1111-4a11-8a11-000000000001";
const DEFAULT_ACTION = "expo.modules.notifications.actions.DEFAULT";

describe("respuesta a una notificación", () => {
  it("los botones del recordatorio responden la asistencia sin abrir la app", () => {
    for (const reply of ["attending", "late", "cancel"] as const) {
      expect(intentFromResponse(reply, { booking_id: BOOKING, category: "booking_reminder" })).toEqual({ type: "reply", bookingId: BOOKING, reply });
    }
  });

  it("tocar la notificación abre la reserva", () => {
    expect(intentFromResponse(DEFAULT_ACTION, { booking_id: BOOKING, url: `/booking/${BOOKING}` })).toEqual({ type: "open", url: `/booking/${BOOKING}` });
  });

  it("un aviso de reporte abre 'Mis reportes'", () => {
    expect(intentFromResponse(DEFAULT_ACTION, { ticket_id: "t1" })).toEqual({ type: "open", url: "/support" });
  });

  it("nunca abre URLs externas que vengan en la notificación", () => {
    expect(intentFromResponse(DEFAULT_ACTION, { url: "https://example.com/phish" })).toBeNull();
    expect(intentFromResponse(DEFAULT_ACTION, { url: "//example.com" })).toBeNull();
    expect(intentFromResponse(DEFAULT_ACTION, undefined)).toBeNull();
  });
});
