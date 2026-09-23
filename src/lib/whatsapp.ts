import { WHATSAPP_BASE_URL } from "@/shared/site";

/** Mismo formato que la web (wa.me + texto). El número sale de la fuente única `site.ts`. */
export function buildWhatsAppUrl(text?: string): string {
  return text ? `${WHATSAPP_BASE_URL}?text=${encodeURIComponent(text)}` : WHATSAPP_BASE_URL;
}
