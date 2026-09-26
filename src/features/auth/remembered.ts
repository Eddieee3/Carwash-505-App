import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Último correo con el que se entró en ESTE dispositivo y si esa cuenta ya tiene contraseña.
 * Vive solo en el teléfono (no en la base de datos): así la app no permite averiguar qué correos están registrados.
 */
export type Remembered = { email: string; hasPassword: boolean };
const KEY = "cw505-last-login";

export function parseRemembered(raw: string | null): Remembered | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<Remembered>;
    return typeof v.email === "string" && v.email.includes("@") ? { email: v.email, hasPassword: v.hasPassword === true } : null;
  } catch {
    return null;
  }
}

const store = {
  get: async () => (Platform.OS === "web" ? (globalThis.localStorage?.getItem(KEY) ?? null) : SecureStore.getItemAsync(KEY)),
  set: async (v: string) => (Platform.OS === "web" ? globalThis.localStorage?.setItem(KEY, v) : SecureStore.setItemAsync(KEY, v)),
  del: async () => (Platform.OS === "web" ? globalThis.localStorage?.removeItem(KEY) : SecureStore.deleteItemAsync(KEY)),
};

export async function getRemembered(): Promise<Remembered | null> {
  return parseRemembered(await store.get().catch(() => null));
}

/** Guarda el correo; `hasPassword` se conserva si no se indica (entrar con código no borra la contraseña). */
export async function remember(email: string, hasPassword?: boolean): Promise<void> {
  const prev = await getRemembered();
  const keep = prev?.email === email ? prev.hasPassword : false;
  await store.set(JSON.stringify({ email, hasPassword: hasPassword ?? keep })).catch(() => undefined);
}

export async function forget(): Promise<void> {
  await store.del().catch(() => undefined);
}

/** Regla de la app para contraseñas de clientes y dueño (Supabase exige mínimo 6). */
export function passwordProblem(password: string, confirm: string): "weak" | "mismatch" | null {
  if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return "weak";
  if (password !== confirm) return "mismatch";
  return null;
}
