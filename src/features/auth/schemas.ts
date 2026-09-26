import { z } from "zod";

// Mismo criterio que el login del panel web: correo recortado y en minúsculas, máximo 120.
export const emailSchema = z.email().max(120);

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Número de WhatsApp en formato E.164 (+50587199678). 8 dígitos sin código de país = Nicaragua (+505).
 * Devuelve null si no es un número válido.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!trimmed.startsWith("+") && /^[2578]\d{7}$/.test(digits)) return `+505${digits}`;
  if (/^\d{8,15}$/.test(digits) && (trimmed.startsWith("+") || digits.startsWith("505"))) return `+${digits}`;
  return null;
}

/** Código OTP de 6 dígitos (otp_length = 6 en supabase/config.toml). Acepta espacios pegados. */
export const otpSchema = z
  .string()
  .transform((v) => v.replace(/\s/g, ""))
  .pipe(z.string().regex(/^\d{6}$/));
