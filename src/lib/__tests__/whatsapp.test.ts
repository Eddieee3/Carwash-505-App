import { buildWhatsAppUrl } from "../whatsapp";

describe("enlace de WhatsApp", () => {
  it("usa el número confirmado de la fuente única (site.ts de la web)", () => {
    expect(buildWhatsAppUrl()).toBe("https://wa.me/50587199678");
  });

  it("codifica el texto", () => {
    expect(buildWhatsAppUrl("Hola, quiero reservar")).toBe("https://wa.me/50587199678?text=Hola%2C%20quiero%20reservar");
  });
});
