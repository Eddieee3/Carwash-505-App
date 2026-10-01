import { z } from "zod";
import type { Copy } from "@/i18n";
import type { VehicleKind, VehicleRow } from "@/shared/database";

export const VEHICLE_KINDS = ["car", "suv", "large", "other"] as const satisfies readonly VehicleKind[];

// Mismos límites que la tabla `vehicles` (migraciones 7 y 25).
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "too_long")
    .transform((v) => (v === "" ? null : v));

const requiredText = (max: number) => z.string().trim().min(1, "required").max(max, "too_long");

/**
 * Placa de Nicaragua (formato aprobado por el negocio, 2026-10-01): 1–2 letras + 3–6 dígitos, guardada como "M 123456".
 * Es la misma regla que aplica la base de datos (normalize_plate + vehicles_plate_format): la API rechaza lo mismo.
 */
export const PLATE_PATTERN = /^[A-Z]{1,2} [0-9]{3,6}$/;

/** " m-123 456 " → "M 123456". Lo que no tiene forma de placa se devuelve en mayúsculas, sin separadores. */
export function normalizePlate(value: string): string | null {
  const v = value.replace(/[\s.-]/g, "").toUpperCase();
  if (v === "") return null;
  const m = /^([A-Z]{1,2})([0-9]{3,6})$/.exec(v);
  return m ? `${m[1]} ${m[2]}` : v;
}

/** Año admitido: de 1950 al año próximo (modelos del año siguiente). */
export function maxVehicleYear(now = new Date()): number {
  return now.getFullYear() + 1;
}

export const vehicleSchema = z.object({
  kind: z.enum(VEHICLE_KINDS),
  make: requiredText(40),
  model: requiredText(40),
  color: optionalText(30),
  nickname: optionalText(40),
  plate: z
    .string()
    .trim()
    .max(15, "too_long")
    .transform((v, ctx) => {
      const plate = normalizePlate(v);
      if (plate !== null && !PLATE_PATTERN.test(plate)) {
        ctx.addIssue({ code: "custom", message: "invalid_plate" });
        return z.NEVER;
      }
      return plate;
    }),
  year: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const n = Number(v);
      if (!/^\d{4}$/.test(v) || n < 1950 || n > maxVehicleYear()) {
        ctx.addIssue({ code: "custom", message: "invalid_year" });
        return z.NEVER;
      }
      return n;
    }),
  is_default: z.boolean(),
});

export type VehicleForm = z.input<typeof vehicleSchema>;
export type VehicleInput = z.output<typeof vehicleSchema>;

export function emptyVehicleForm(): VehicleForm {
  return { kind: "car", make: "", model: "", color: "", nickname: "", plate: "", year: "", is_default: false };
}

export function vehicleToForm(v: VehicleRow): VehicleForm {
  return {
    kind: v.kind,
    make: v.make ?? "",
    model: v.model ?? "",
    color: v.color ?? "",
    nickname: v.nickname ?? "",
    plate: v.plate ?? "",
    year: v.year === null ? "" : String(v.year),
    is_default: v.is_default,
  };
}

type Labelled = Pick<VehicleRow, "kind" | "make" | "model" | "nickname">;

/** "Mi carro" · "Toyota Hilux" · o el tipo si no hay más datos. */
export function vehicleLabel(v: Labelled, copy: Copy): string {
  if (v.nickname) return v.nickname;
  const name = [v.make, v.model].filter(Boolean).join(" ");
  return name || copy.garage.kinds[v.kind];
}
