import { z } from "zod";
import type { Copy } from "@/i18n";
import type { VehicleKind, VehicleRow } from "@/shared/database";

export const VEHICLE_KINDS = ["car", "suv", "large", "other"] as const satisfies readonly VehicleKind[];

// Mismos límites que la tabla `vehicles` (migración 7).
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "too_long")
    .transform((v) => (v === "" ? null : v));

export const vehicleSchema = z.object({
  kind: z.enum(VEHICLE_KINDS),
  make: optionalText(40),
  model: optionalText(40),
  color: optionalText(30),
  nickname: optionalText(40),
  plate: z
    .string()
    .trim()
    .max(15, "too_long")
    .transform((v) => (v === "" ? null : v.toUpperCase())),
  year: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1950 || n > 2100) {
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
