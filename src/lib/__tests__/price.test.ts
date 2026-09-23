import { formatPrice, parseAmount, priceForVehicle } from "../price";

const service = { price_car: 110, price_suv: 140, requires_evaluation: false };

describe("precio por vehículo (mismo criterio que la web y book_slot)", () => {
  it("usa el precio de sedán o de camioneta según el vehículo", () => {
    expect(priceForVehicle(service, "car")).toBe(110);
    expect(priceForVehicle(service, "suv")).toBe(140);
  });

  it("no inventa precio: evaluación, tipo 'otro' o precio vacío → sin monto", () => {
    expect(priceForVehicle({ ...service, requires_evaluation: true }, "car")).toBeNull();
    expect(priceForVehicle(service, "other")).toBeNull();
    expect(priceForVehicle({ ...service, price_suv: null }, "suv")).toBeNull();
  });

  it("formatea el monto en su moneda", () => {
    expect(formatPrice(110, "NIO", "es")).toMatch(/110/);
    expect(formatPrice(65, "USD", "en")).toMatch(/\$65/);
    expect(formatPrice(null, "USD", "es")).toBeNull();
  });
});

describe("monto escrito por el personal (cobro con gift card)", () => {
  it("acepta enteros y hasta 2 decimales con punto o coma", () => {
    expect(parseAmount("150")).toBe(150);
    expect(parseAmount(" 150.5 ")).toBe(150.5);
    expect(parseAmount("150,50")).toBe(150.5);
  });
  it("rechaza vacío, cero, negativos, texto y más de 2 decimales", () => {
    for (const bad of ["", "0", "-5", "abc", "1.234", "1e3", "1.2.3"]) expect(parseAmount(bad)).toBeNull();
  });
});
