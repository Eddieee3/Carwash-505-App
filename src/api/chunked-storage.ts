/**
 * Adaptador de almacenamiento para Supabase Auth sobre SecureStore (Keychain / Keystore).
 * SecureStore limita cada valor a ~2 KB y una sesión de Supabase puede superarlo, así que el
 * valor se divide en trozos. El contador se escribe al final: una escritura a medias no se lee.
 */
export type SecureBackend = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

export const CHUNK_SIZE = 1800;

const countKey = (key: string) => `${key}.chunks`;
const chunkKey = (key: string, i: number) => `${key}.${i}`;

export function createChunkedStorage(backend: SecureBackend) {
  async function removeItem(key: string): Promise<void> {
    const n = Number(await backend.getItemAsync(countKey(key))) || 0;
    await backend.deleteItemAsync(countKey(key));
    await Promise.all(Array.from({ length: n }, (_, i) => backend.deleteItemAsync(chunkKey(key, i))));
  }

  async function getItem(key: string): Promise<string | null> {
    const n = Number(await backend.getItemAsync(countKey(key))) || 0;
    if (n === 0) return null;
    const parts = await Promise.all(Array.from({ length: n }, (_, i) => backend.getItemAsync(chunkKey(key, i))));
    return parts.some((p) => p === null) ? null : parts.join("");
  }

  async function setItem(key: string, value: string): Promise<void> {
    await removeItem(key);
    const chunks = value.match(new RegExp(`[\\s\\S]{1,${CHUNK_SIZE}}`, "g")) ?? [""];
    for (let i = 0; i < chunks.length; i += 1) await backend.setItemAsync(chunkKey(key, i), chunks[i]);
    await backend.setItemAsync(countKey(key), String(chunks.length));
  }

  return { getItem, setItem, removeItem };
}
