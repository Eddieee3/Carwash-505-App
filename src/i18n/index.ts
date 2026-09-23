import { getLocales } from "expo-localization";
import type { Locale } from "@/shared/site";
import { en } from "./en";
import { es, type Copy } from "./es";

/** Español por defecto (como la web); inglés solo si el teléfono está en inglés. */
export function currentLocale(): Locale {
  return getLocales()[0]?.languageCode === "en" ? "en" : "es";
}

export function getCopy(locale: Locale = currentLocale()): Copy {
  return locale === "en" ? en : es;
}

export type { Copy };
