/**
 * Variables públicas de la app (se incrustan en el bundle: nunca poner secretos aquí).
 * Deben leerse con acceso estático `process.env.EXPO_PUBLIC_*` para que Expo las reemplace.
 */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  /** Inicio de sesión con código por WhatsApp. Solo "true" lo activa (requiere Twilio configurado en Supabase). */
  whatsappLogin: process.env.EXPO_PUBLIC_WHATSAPP_LOGIN === "true",
};

export function isSupabaseConfigured(): boolean {
  return /^https?:\/\//.test(env.supabaseUrl) && env.supabaseAnonKey.length > 20;
}
