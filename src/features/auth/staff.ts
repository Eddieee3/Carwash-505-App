/**
 * El personal del local entra con usuario + contraseña. El usuario se guarda en Supabase Auth como un correo
 * interno que nunca recibe mensajes (lo crea el dueño con la Edge Function staff-users, que usa el mismo dominio).
 */
export const STAFF_EMAIL_DOMAIN = "personal.carwash505.invalid";

export function normalizeUsername(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, ".");
}

export const staffEmail = (username: string) => `${normalizeUsername(username)}@${STAFF_EMAIL_DOMAIN}`;
