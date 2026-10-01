import type { Copy } from "@/i18n";
import { formatPrice } from "@/lib/price";
import type { PriceSnapshot } from "@/shared/database";
import type { Locale } from "@/shared/site";

export type BreakdownLine = { key: string; label: string; value: string; tone: "neutral" | "discount" | "surcharge" };
export type Breakdown = { lines: BreakdownLine[]; total: string };

/** "+20 %" / "−15 %" (signo menos tipográfico). */
export function formatPct(pct: number): string {
  return `${pct > 0 ? "+" : "−"}${Math.abs(pct)} %`;
}

/**
 * Desglose que ve el cliente, siempre a partir del cálculo del servidor (quote_price o price_snapshot).
 * La app nunca recalcula el precio: solo lo presenta. Reservas anteriores a la F5 no traen desglose.
 */
export function breakdown(s: PriceSnapshot, locale: Locale, c: Copy): Breakdown {
  const money = (n: number | null | undefined) => (n === null || n === undefined ? null : formatPrice(Number(n), s.currency, locale));
  const name = (x: { label_es?: string; label_en?: string; name_es?: string; name_en?: string }) =>
    (locale === "en" ? (x.label_en ?? x.name_en) : (x.label_es ?? x.name_es)) ?? "";
  const lines: BreakdownLine[] = [];

  lines.push({
    key: "base",
    label: locale === "en" ? s.service_name_en : s.service_name_es,
    // `base` es el precio del principal (null = requiere evaluación); reservas anteriores a la F5 no lo traen.
    value: (s.base !== undefined ? money(s.base) : s.requires_evaluation ? null : money(s.amount)) ?? c.pricing.evaluation,
    tone: "neutral",
  });
  for (const a of s.adjustments ?? []) {
    lines.push({ key: `adj-${a.kind}`, label: name(a), value: formatPct(a.pct), tone: a.pct < 0 ? "discount" : "surcharge" });
  }
  if (s.cap_applied && s.adjustment_pct !== undefined) {
    lines.push({ key: "cap", label: c.pricing.cap, value: formatPct(s.adjustment_pct), tone: s.adjustment_pct < 0 ? "discount" : "surcharge" });
  }
  if (s.offer) lines.push({ key: "offer", label: c.pricing.offer, value: formatPct(-s.offer.pct), tone: "discount" });
  if (s.membership) {
    lines.push({ key: "membership", label: c.pricing.membership(name(s.membership)), value: formatPct(-s.membership.pct), tone: "discount" });
  }
  for (const x of s.services ?? []) {
    lines.push({ key: `service-${x.service_id}`, label: `+ ${name(x)}`, value: money(x.price) ?? c.pricing.toQuote, tone: "neutral" });
  }
  for (const x of s.addons ?? []) {
    lines.push({ key: `addon-${x.product_id}`, label: `+ ${name(x)}`, value: money(x.price) ?? "", tone: "neutral" });
  }
  if (s.vip?.free_wash) {
    lines.push({ key: "vip", label: c.pricing.vipFree, value: `−${money(s.vip.discount) ?? ""}`, tone: "discount" });
  }

  // Con una parte por cotizar no hay total definitivo: se muestra lo conocido como "desde", nunca 0.
  const partial = s.amount === null && s.partial_amount ? money(s.partial_amount) : null;
  return { lines, total: money(s.amount) ?? (partial ? c.pricing.partialTotal(partial) : c.book.priceToConfirm) };
}

/** Cumpleaños escrito como AAAA-MM-DD: fecha real, desde 1900 y no futura. Devuelve la misma cadena o null. */
export function parseBirthday(text: string, today: string): string | null {
  const value = text.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  if (y < 1900 || value > today) return null;
  return value;
}
