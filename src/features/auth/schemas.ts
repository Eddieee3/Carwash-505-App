import { z } from "zod";

// Mismo criterio que el login del panel web: correo recortado y en minúsculas, máximo 120.
export const emailSchema = z.email().max(120);

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/** Código OTP de 6 dígitos (otp_length = 6 en supabase/config.toml). Acepta espacios pegados. */
export const otpSchema = z
  .string()
  .transform((v) => v.replace(/\s/g, ""))
  .pipe(z.string().regex(/^\d{6}$/));
