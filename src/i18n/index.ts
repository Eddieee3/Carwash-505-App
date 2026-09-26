import type { Locale } from "@/shared/site";
import { en } from "./en";
import { es, type Copy } from "./es";

/** La app se muestra siempre en español (decisión del negocio), sin importar el idioma del teléfono. */
export function currentLocale(): Locale {
  return "es";
}

export function getCopy(locale: Locale = currentLocale()): Copy {
  return locale === "en" ? en : es;
}

export type { Copy };
