import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { AppState, Platform } from "react-native";
import { createChunkedStorage } from "./chunked-storage";
import { env, isSupabaseConfigured } from "./env";

/** En la web de desarrollo (expo start --web) no hay SecureStore: se usa localStorage. */
const storage =
  Platform.OS === "web"
    ? {
        getItem: async (k: string) => globalThis.localStorage?.getItem(k) ?? null,
        setItem: async (k: string, v: string) => globalThis.localStorage?.setItem(k, v),
        removeItem: async (k: string) => globalThis.localStorage?.removeItem(k),
      }
    : createChunkedStorage(SecureStore);

/**
 * Cliente único con la clave pública (anon) y la sesión del usuario: todo lo filtra RLS.
 * `null` si falta configuración; la app muestra "Configuración pendiente" en vez de fallar.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage,
        storageKey: "cw505-auth",
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

/** Cliente para consultas: las pantallas solo se montan con Supabase configurado (si no, se ve "setup"). */
export function db(): SupabaseClient {
  if (!supabase) throw new Error("supabase_not_configured");
  return supabase;
}

/** Id del usuario con sesión (para escribir filas propias como `vehicles.customer_id`). */
export async function currentUserId(): Promise<string> {
  const { data } = await db().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("not_authenticated");
  return id;
}

// Renueva el token solo con la app en primer plano (recomendación de Supabase para apps móviles).
if (supabase && Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
