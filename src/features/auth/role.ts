import type { UserRole } from "@/shared/database";

export type ProfileLite = { role: UserRole; status: "active" | "disabled" };
export type CustomerLite = { status: "active" | "disabled" };

/**
 * Rol con el que se usa la app. Sale siempre de la BD (profiles / customers bajo RLS), nunca del token.
 *  - owner: super_admin · operator: colaborador · customer: cliente
 *  - panel_only: editor/viewer sin ficha de cliente (trabajan en el panel web)
 *  - disabled: cuenta deshabilitada · unknown: no se encontró ficha
 */
export type AppRole = "owner" | "operator" | "customer" | "panel_only" | "disabled" | "unknown";

export function resolveAppRole(profile: ProfileLite | null, customer: CustomerLite | null): AppRole {
  if (profile?.status === "active") {
    if (profile.role === "super_admin") return "owner";
    if (profile.role === "operator") return "operator";
  }
  if (customer) return customer.status === "active" ? "customer" : "disabled";
  if (profile) return profile.status === "active" ? "panel_only" : "disabled";
  return "unknown";
}

/** Zona de la app que corresponde a cada estado. Única fuente para las rutas protegidas. */
export type AppView = "loading" | "setup" | "auth" | "customer" | "operator" | "owner" | "blocked";

export function resolveView(input: {
  configured: boolean;
  sessionLoading: boolean;
  hasSession: boolean;
  role: AppRole | null;
  roleError: boolean;
}): AppView {
  if (!input.configured) return "setup";
  if (input.sessionLoading) return "loading";
  if (!input.hasSession) return "auth";
  if (input.roleError) return "blocked";
  if (input.role === null) return "loading";
  if (input.role === "customer" || input.role === "operator" || input.role === "owner") return input.role;
  return "blocked";
}
