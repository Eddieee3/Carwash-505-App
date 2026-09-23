import { es } from "@/i18n/es";
import { emptyVehicleForm, vehicleLabel, vehicleSchema } from "../vehicle";

describe("formulario de vehículo", () => {
  it("normaliza: vacíos a null, placa en mayúsculas, año numérico", () => {
    const parsed = vehicleSchema.parse({ ...emptyVehicleForm(), kind: "suv", make: " Toyota ", plate: "m 123-456", year: "2020" });
    expect(parsed).toEqual({
      kind: "suv",
      make: "Toyota",
      model: null,
      color: null,
      nickname: null,
      plate: "M 123-456",
      year: 2020,
      is_default: false,
    });
  });

  it("rechaza años imposibles y textos más largos que la BD", () => {
    const bad = vehicleSchema.safeParse({ ...emptyVehicleForm(), year: "1800", plate: "X".repeat(16) });
    expect(bad.success).toBe(false);
    const messages = bad.error!.issues.map((i) => `${String(i.path[0])}:${i.message}`);
    expect(messages).toEqual(expect.arrayContaining(["year:invalid_year", "plate:too_long"]));
  });

  it("etiqueta: apodo, luego marca y modelo, luego el tipo", () => {
    expect(vehicleLabel({ kind: "car", make: "Toyota", model: "Yaris", nickname: "El rojo" }, es)).toBe("El rojo");
    expect(vehicleLabel({ kind: "car", make: "Toyota", model: "Yaris", nickname: null }, es)).toBe("Toyota Yaris");
    expect(vehicleLabel({ kind: "suv", make: null, model: null, nickname: null }, es)).toBe("SUV o camioneta");
  });
});
