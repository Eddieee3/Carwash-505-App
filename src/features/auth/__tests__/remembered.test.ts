import { parseRemembered, passwordProblem } from "../remembered";

jest.mock("expo-secure-store", () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));

describe("correo recordado en el dispositivo", () => {
  it("lee solo datos válidos", () => {
    expect(parseRemembered(JSON.stringify({ email: "a@b.com", hasPassword: true }))).toEqual({ email: "a@b.com", hasPassword: true });
    expect(parseRemembered(JSON.stringify({ email: "a@b.com" }))).toEqual({ email: "a@b.com", hasPassword: false });
    expect(parseRemembered("no-json")).toBeNull();
    expect(parseRemembered(JSON.stringify({ email: "sin-arroba" }))).toBeNull();
    expect(parseRemembered(null)).toBeNull();
  });
});

describe("contraseña de clientes y dueño", () => {
  it("mínimo 8 caracteres con letras y números, y las dos iguales", () => {
    expect(passwordProblem("Lavado2026", "Lavado2026")).toBeNull();
    expect(passwordProblem("corta1", "corta1")).toBe("weak");
    expect(passwordProblem("sinnumeros", "sinnumeros")).toBe("weak");
    expect(passwordProblem("Lavado2026", "Lavado2027")).toBe("mismatch");
  });
});
