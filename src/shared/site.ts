// GENERADO por scripts/sync-shared.mjs desde "Car Wash 505/src/config/site.ts". No editar a mano.
/**
 * Fuente única de datos confirmados del negocio.
 * Ningún componente debe repetir teléfono, horario, dirección ni enlaces.
 * Lo que aún no está confirmado se deja en `null` y no se publica.
 */

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo
export type DayHours = { open: string; close: string } | null; // "HH:mm" en la zona del negocio
export type OpeningHours = Record<Weekday, DayHours>;

// Horario publicado por el negocio: lunes a sábado 7:00 a. m. a 6:00 p. m.; domingo 7:00 a. m. a 5:00 p. m.
const WEEKDAYS: DayHours = { open: "07:00", close: "18:00" };
const SUNDAY: DayHours = { open: "07:00", close: "17:00" };

const HOURS: OpeningHours = {
  0: SUNDAY,
  1: WEEKDAYS,
  2: WEEKDAYS,
  3: WEEKDAYS,
  4: WEEKDAYS,
  5: WEEKDAYS,
  6: WEEKDAYS,
};

export const BUSINESS = {
  name: "Car Wash 505",
  timezone: "America/Managua",
  whatsapp: {
    /** Formato wa.me: solo dígitos con código de país. */
    number: "50587199678",
    display: "+505 8719 9678",
  },
  address: {
    es: "Km 12.2 Carretera a Masaya, frente a La Contentera, Esquipulas, Managua, Nicaragua.",
    en: "Km 12.2 Carretera a Masaya, across from La Contentera, Esquipulas, Managua, Nicaragua.",
  },
  /** Lunes a sábado 7:00–18:00; domingo 7:00–17:00. */
  hours: HOURS,
  /** Enlaces oficiales. `null` = no confirmado, no se muestra. */
  links: {
    waze: null as string | null,
    googleMaps: null as string | null,
    instagram: null as string | null,
    facebook: null as string | null,
    /** Fichas oficiales de la app móvil (F7). `null` hasta publicarla: /t/<id> lleva al inicio. */
    appStore: null as string | null,
    playStore: null as string | null,
  },
  /** Moneda de los precios. PENDIENTE DE CONFIRMAR; no se muestra ningún precio aún. */
  currency: "USD",
};

/** Texto permitido: "Distribuidor autorizado Nytrox en Nicaragua". No afirmar exclusividad ni certificación. */
export const NYTROX_DEFAULTS = {
  officialUrl: null as string | null,
  logoPath: null as string | null,
};

export const WHATSAPP_BASE_URL = `https://wa.me/${BUSINESS.whatsapp.number}`;
