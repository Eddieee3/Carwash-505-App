import { createContext, useContext, type ReactNode } from "react";
import { dark, light, type Theme } from "./tokens";

/**
 * Tema oscuro por defecto (igual que la web). `tone="light"` equivale a `.surface-light`:
 * se usa en bloques concretos (formularios largos, recibos), no para toda la app.
 */
const ThemeContext = createContext<Theme>(dark);

export function ThemeProvider({ tone = "dark", children }: { tone?: "dark" | "light"; children: ReactNode }) {
  return <ThemeContext.Provider value={tone === "light" ? light : dark}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
