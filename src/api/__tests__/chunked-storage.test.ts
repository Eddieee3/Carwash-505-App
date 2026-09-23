import { CHUNK_SIZE, createChunkedStorage, type SecureBackend } from "../chunked-storage";

function memoryBackend() {
  const map = new Map<string, string>();
  const backend: SecureBackend = {
    getItemAsync: async (k) => map.get(k) ?? null,
    setItemAsync: async (k, v) => void map.set(k, v),
    deleteItemAsync: async (k) => void map.delete(k),
  };
  return { map, backend };
}

describe("almacenamiento de sesión por trozos (SecureStore ~2 KB por valor)", () => {
  it("guarda y lee una sesión más grande que el límite", async () => {
    const { map, backend } = memoryBackend();
    const storage = createChunkedStorage(backend);
    const session = "x".repeat(5000);
    await storage.setItem("cw505-auth", session);
    expect(await storage.getItem("cw505-auth")).toBe(session);
    for (const value of map.values()) expect(value.length).toBeLessThanOrEqual(CHUNK_SIZE);
    expect(map.get("cw505-auth.chunks")).toBe("3");
  });

  it("al sobrescribir con un valor más corto no quedan trozos viejos", async () => {
    const { map, backend } = memoryBackend();
    const storage = createChunkedStorage(backend);
    await storage.setItem("k", "a".repeat(CHUNK_SIZE * 3));
    await storage.setItem("k", "corto");
    expect(await storage.getItem("k")).toBe("corto");
    expect([...map.keys()].sort()).toEqual(["k.0", "k.chunks"]);
  });

  it("removeItem borra todo y getItem devuelve null", async () => {
    const { map, backend } = memoryBackend();
    const storage = createChunkedStorage(backend);
    await storage.setItem("k", "y".repeat(4000));
    await storage.removeItem("k");
    expect(map.size).toBe(0);
    expect(await storage.getItem("k")).toBeNull();
  });

  it("si falta un trozo, no devuelve una sesión corrupta", async () => {
    const { map, backend } = memoryBackend();
    const storage = createChunkedStorage(backend);
    await storage.setItem("k", "z".repeat(4000));
    map.delete("k.1");
    expect(await storage.getItem("k")).toBeNull();
  });

  it("conserva caracteres no ASCII (tildes, emojis en metadatos)", async () => {
    const { backend } = memoryBackend();
    const storage = createChunkedStorage(backend);
    const value = JSON.stringify({ name: "José Peña 🚗", pad: "ñ".repeat(3000) });
    await storage.setItem("k", value);
    expect(await storage.getItem("k")).toBe(value);
  });
});
