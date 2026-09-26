import type { Locale } from "@/shared/site";
import type { ServiceRow, VehicleKind } from "@/shared/database";

const TAG: Record<Locale, string> = { es: "es-NI", en: "en-US" };

/** Mismo criterio que la web y que book_slot(): sin precio centralizado para ese vehículo, no hay monto. */
export function priceForVehicle(
  service: Pick<ServiceRow, "price_car" | "price_suv" | "price_large" | "requires_evaluation">,
  kind: VehicleKind,
): number | null {
  if (service.requires_evaluation || kind === "other") return null;
  const amount = kind === "large" ? service.price_large : kind === "suv" ? service.price_suv : service.price_car;
  return amount === null || !Number.isFinite(amount) || amount < 0 ? null : amount;
}

export function formatPrice(amount: number | null, currency: string, locale: Locale): string | null {
  if (amount === null || !Number.isFinite(amount) || amount < 0) return null;
  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  };
  try {
    return new Intl.NumberFormat(TAG[locale], { ...options, currencyDisplay: "narrowSymbol" }).format(amount);
  } catch {
    // Algunos motores no soportan narrowSymbol.
    return new Intl.NumberFormat(TAG[locale], options).format(amount);
  }
}

/** Monto que escribe el personal ("150", "150.5", "150,50"). Positivo, máx. 2 decimales; si no, null. */
export function parseAmount(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return amount > 0 ? amount : null;
}
