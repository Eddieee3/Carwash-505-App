import { resolveAppRole, resolveView, type AppRole } from "../role";
import { HOME } from "../home";

describe("resolveAppRole: el rol sale de profiles/customers, nunca del token", () => {
  const active = "active" as const;
  const disabled = "disabled" as const;

  it.each<[string, Parameters<typeof resolveAppRole>, AppRole]>([
    ["super_admin → propietario", [{ role: "super_admin", status: active }, null], "owner"],
    ["operator → colaborador", [{ role: "operator", status: active }, null], "operator"],
    ["cliente activo", [null, { status: active }], "customer"],
    ["cliente deshabilitado", [null, { status: disabled }], "disabled"],
    ["editor sin ficha de cliente → solo panel", [{ role: "editor", status: active }, null], "panel_only"],
    ["viewer sin ficha de cliente → solo panel", [{ role: "viewer", status: active }, null], "panel_only"],
    ["editor que además es cliente → cliente", [{ role: "editor", status: active }, { status: active }], "customer"],
    ["operator deshabilitado sin ficha → deshabilitado", [{ role: "operator", status: disabled }, null], "disabled"],
    ["super_admin deshabilitado pero cliente → cliente", [{ role: "super_admin", status: disabled }, { status: active }], "customer"],
    ["sin fichas → desconocido", [null, null], "unknown"],
  ])("%s", (_name, args, expected) => {
    expect(resolveAppRole(...args)).toBe(expected);
  });
});

describe("resolveView: qué zona de la app se muestra", () => {
  const base = { configured: true, sessionLoading: false, hasSession: true, role: "customer" as AppRole | null, roleError: false };

  it("sin configuración de Supabase → pantalla de configuración pendiente", () => {
    expect(resolveView({ ...base, configured: false })).toBe("setup");
  });
  it("mientras se lee la sesión o el rol → cargando", () => {
    expect(resolveView({ ...base, sessionLoading: true })).toBe("loading");
    expect(resolveView({ ...base, role: null })).toBe("loading");
  });
  it("sin sesión → autenticación", () => {
    expect(resolveView({ ...base, hasSession: false, role: null })).toBe("auth");
  });
  it("cada rol va a su zona; el resto queda bloqueado", () => {
    expect(resolveView({ ...base, role: "customer" })).toBe("customer");
    expect(resolveView({ ...base, role: "operator" })).toBe("operator");
    expect(resolveView({ ...base, role: "owner" })).toBe("owner");
    for (const role of ["panel_only", "disabled", "unknown"] as const) {
      expect(resolveView({ ...base, role })).toBe("blocked");
    }
  });
  it("si falla la lectura del rol → bloqueado con opción de reintentar", () => {
    expect(resolveView({ ...base, role: null, roleError: true })).toBe("blocked");
  });
  it("toda vista navegable tiene pantalla de inicio", () => {
    expect(Object.keys(HOME).sort()).toEqual(["auth", "blocked", "customer", "operator", "owner", "setup"]);
  });
});
