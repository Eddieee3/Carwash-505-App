import type { Locale, OpeningHours } from "@/shared/site";
import { BUSINESS } from "@/shared/site";

/**
 * Fechas en la zona del negocio (America/Managua). La BD guarda UTC; aquí solo se muestra y se
 * calcula "qué día es" para el negocio. Los días se representan como "YYYY-MM-DD".
 */
export const BUSINESS_TZ = BUSINESS.timezone;
const TAG: Record<Locale, string> = { es: "es-NI", en: "en-US" };

function parts(date: Date, tz: string) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), mi: get("minute") };
}

/** Día del negocio ("YYYY-MM-DD") para un instante. */
export function localDate(date: Date = new Date(), tz = BUSINESS_TZ): string {
  const { y, m, d } = parts(date, tz);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function nextDays(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(from, i));
}

/** Día de la semana (0 = domingo), igual que las claves del horario en business_settings. */
export function weekday(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "YYYY-MM-DD" + "HH:mm" en la zona del negocio → instante UTC. */
export function zonedToUtc(ymd: string, hhmm: string, tz = BUSINESS_TZ): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const seen = parts(new Date(guess), tz);
  const offset = Date.UTC(seen.y, seen.m - 1, seen.d, seen.h, seen.mi) - guess;
  return new Date(guess - offset);
}

/** Hora de cierre de un día (en UTC) según el horario del negocio, o null si ese día no se atiende. */
export function closingTime(hours: OpeningHours, day: string, tz = BUSINESS_TZ): Date | null {
  const today = hours[weekday(day) as keyof OpeningHours];
  return today ? zonedToUtc(day, today.close, tz) : null;
}

/** Fin de un rango Postgres `["inicio","fin")` (formato de `bookings.slot`) como ISO, o null. */
export function rangeEnd(range: string): string | null {
  const match = /^[[(]"?([^",]+)"?,\s*"?([^")\]]+)"?[)\]]$/.exec(range.trim());
  if (!match) return null;
  const end = new Date(match[2].replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
  return Number.isNaN(end.getTime()) ? null : end.toISOString();
}

export function formatTime(iso: string | Date, locale: Locale, tz = BUSINESS_TZ): string {
  return new Intl.DateTimeFormat(TAG[locale], { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function formatDateLong(iso: string | Date, locale: Locale, tz = BUSINESS_TZ): string {
  return new Intl.DateTimeFormat(TAG[locale], { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
}

/** U03: solo la primera letra en mayúscula ("Octubre de 2026", "Miércoles, 1 de octubre"), no cada palabra. */
export function sentenceCase(s: string): string {
  return s.charAt(0).toLocaleUpperCase() + s.slice(1);
}

/** Etiqueta corta de un día: "Hoy", "Mañana" o "lun 23". */
export function dayLabel(ymd: string, today: string, locale: Locale, words: { today: string; tomorrow: string }): string {
  if (ymd === today) return words.today;
  if (ymd === addDays(today, 1)) return words.tomorrow;
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat(TAG[locale], { timeZone: "UTC", weekday: "short", day: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  );
}
