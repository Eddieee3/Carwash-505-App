import type { Href } from "expo-router";
import type { AppView } from "./role";

/** Pantalla de inicio de cada zona. Al cambiar la sesión o el rol, el router vuelve a `/` y redirige aquí. */
export const HOME: Record<Exclude<AppView, "loading">, Href> = {
  setup: "/setup",
  auth: "/welcome",
  customer: "/home",
  operator: "/today",
  owner: "/dashboard",
  blocked: "/no-access",
};
