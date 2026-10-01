import { es } from "@/i18n/es";
import { emptyVehicleForm, normalizePlate, vehicleLabel, vehicleSchema } from "../vehicle";

describe("formulario de vehículo", () => {
  it("normaliza: vacíos a null, placa al formato de Nicaragua, año numérico", () => {
    const parsed = vehicleSchema.parse({ ...emptyVehicleForm(), kind: "suv", make: " Toyota ", model: "Hilux", plate: "m 123-456", year: "2020" });
    expect(parsed).toEqual({
      kind: "suv",
      make: "Toyota",
      model: "Hilux",
      color: null,
      nickname: null,
      plate: "M 123456",
      year: 2020,
      is_default: false,
    });
  });

  it("rechaza años imposibles, textos más largos que la BD y marca/modelo vacíos", () => {
    const bad = vehicleSchema.safeParse({ ...emptyVehicleForm(), year: "1800", plate: "X".repeat(16) });
    expect(bad.success).toBe(false);
    const messages = bad.error!.issues.map((i) => `${String(i.path[0])}:${i.message}`);
    expect(messages).toEqual(expect.arrayContaining(["year:invalid_year", "plate:too_long", "make:required", "model:required"]));
    const future = vehicleSchema.safeParse({ ...emptyVehicleForm(), make: "Lexus", model: "IS350", year: String(new Date().getFullYear() + 2) });
    expect(future.error!.issues.map((i) => i.message)).toEqual(["invalid_year"]);
  });

  it("placa: mismas reglas que la base de datos (39493992 se evalúa contra el formato aprobado)", () => {
    const ok = { ...emptyVehicleForm(), make: "Lexus", model: "IS350" };
    expect(vehicleSchema.parse({ ...ok, plate: " gr12345 " }).plate).toBe("GR 12345");
    expect(vehicleSchema.parse({ ...ok, plate: "" }).plate).toBeNull();
    for (const bad of ["39493992", "ABC123", "M12", "M-1234567", "M 12A456"]) {
      expect(vehicleSchema.safeParse({ ...ok, plate: bad }).error?.issues[0].message).toBe("invalid_plate");
    }
    expect(normalizePlate("m.123 456")).toBe("M 123456");
  });

  it("etiqueta: apodo, luego marca y modelo, luego el tipo", () => {
    expect(vehicleLabel({ kind: "car", make: "Toyota", model: "Yaris", nickname: "El rojo" }, es)).toBe("El rojo");
    expect(vehicleLabel({ kind: "car", make: "Toyota", model: "Yaris", nickname: null }, es)).toBe("Toyota Yaris");
    expect(vehicleLabel({ kind: "suv", make: null, model: null, nickname: null }, es)).toBe("SUV o camioneta");
  });
});
