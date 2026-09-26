/**
 * Tokens de diseño de Car Wash 505 para React Native.
 * Fuente: ../Car Wash 505/src/styles/tokens.css y components.css.
 * Si cambia un valor en la web, se cambia aquí igual: la paridad visual es un requisito.
 * `npm run sync:check` compara los colores con la web.
 */
import type { TextStyle } from "react-native";

export const palette = {
  ink: "#05070a",
  graphite: "#070b10",
  navy: "#0b1118",
  surface: "#101820",
  ice: "#f4f7fa",
  steel: "#aab4bf",
  brand: "#0b5ea8",
  brandHover: "#0d6ec4",
  cyan: "#42c8f5",
  /** Amarillo del logo: PROVISIONAL en la web hasta extraerlo del recurso oficial. */
  signal: "#f2c200",
} as const;

/**
 * Colores de estado que la web no necesitaba. Son adiciones propuestas para la app
 * (tablero Kanban, alertas). Pendientes de aprobación junto con la marca.
 */
export const status = {
  success: "#3ccf8e",
  warning: palette.signal,
  danger: "#ff5a5f",
  info: palette.cyan,
} as const;

/** Tema oscuro por defecto (igual que la web). */
export const dark = {
  bg: palette.ink,
  // Vidrio: las superficies dejan ver el fondo ambiental (ver Glass y Backdrop).
  bgRaised: "rgba(255,255,255,0.05)",
  fg: palette.ice,
  fgMuted: palette.steel,
  line: "rgba(255,255,255,0.10)",
  lineStrong: "rgba(255,255,255,0.22)",
  accent: palette.cyan,
  focus: palette.cyan,
  glassBg: "rgba(10,16,23,0.68)",
  glassBgStrong: "rgba(9,14,20,0.86)",
  glassBorder: "rgba(255,255,255,0.1)",
} as const;

/** Superficie clara estratégica (`.surface-light` en la web). */
export const light = {
  bg: palette.ice,
  bgRaised: "#ffffff",
  fg: "#0b1118",
  fgMuted: "#46525f",
  line: "rgba(11,17,24,0.16)",
  lineStrong: "rgba(11,17,24,0.32)",
  accent: palette.brand,
  focus: palette.brand,
  glassBg: "rgba(244,247,250,0.72)",
  glassBgStrong: "rgba(244,247,250,0.9)",
  glassBorder: "rgba(11,17,24,0.08)",
} as const;

export type Theme = { [K in keyof typeof dark]: string };

/** Mismas familias que la web (next/font). En la app se cargan con expo-font / @expo-google-fonts. */
export const fonts = {
  display: {
    medium: "SairaCondensed_500Medium",
    semibold: "SairaCondensed_600SemiBold",
    bold: "SairaCondensed_700Bold",
  },
  sans: {
    regular: "Figtree_400Regular",
    medium: "Figtree_500Medium",
    semibold: "Figtree_600SemiBold",
  },
} as const;

/** Escala tipográfica. Los títulos `display` van en MAYÚSCULAS, como en la web. */
export const type = {
  displayLg: { fontFamily: fonts.display.semibold, fontSize: 40, lineHeight: 40, textTransform: "uppercase" },
  displayMd: { fontFamily: fonts.display.semibold, fontSize: 28, lineHeight: 29, textTransform: "uppercase" },
  displaySm: { fontFamily: fonts.display.semibold, fontSize: 22, lineHeight: 24, textTransform: "uppercase" },
  eyebrow: { fontFamily: fonts.display.medium, fontSize: 13, letterSpacing: 2.6, textTransform: "uppercase" },
  button: { fontFamily: fonts.display.semibold, fontSize: 15, letterSpacing: 1.2, textTransform: "uppercase" },
  body: { fontFamily: fonts.sans.regular, fontSize: 16, lineHeight: 26 },
  bodySm: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 21 },
  label: { fontFamily: fonts.sans.medium, fontSize: 14, lineHeight: 20 },
  number: { fontFamily: fonts.display.medium, fontSize: 15, letterSpacing: 1.8, fontVariant: ["tabular-nums"] },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

/**
 * Saira Condensed dibuja las mayúsculas y las tildes más arriba de lo que declara la fuente: iOS corta esa parte.
 * En iPhone se agrega este espacio arriba de cada título (mismo tamaño de letra; solo más aire encima).
 */
export const iosTopInset: Partial<Record<TypeVariant, number>> = { displayLg: 8, displayMd: 6, displaySm: 5, eyebrow: 2, button: 2, number: 2 };

/** Radios: 0.75rem / 1.25rem / 0.25rem de la web (1rem = 16). */
export const radius = { control: 14, panel: 22, edit: 4, pill: 999 } as const;

/** Glassmorphism minimalista: superficies translúcidas con desenfoque, borde fino y brillo superior. */
export const glass = {
  bg: "rgba(255,255,255,0.05)",
  bgStrong: "rgba(12,18,26,0.72)",
  border: "rgba(255,255,255,0.10)",
  highlight: "rgba(255,255,255,0.18)",
  selected: "rgba(11,94,168,0.34)",
  blur: 28,
} as const;

/** Espaciado en múltiplos de 4. `gutter` = 16 como en la web móvil. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const gutter = space.lg;

/** Área táctil mínima: la web usa min-height 2.75rem (44). */
export const touch = { min: 44 } as const;

/** Duraciones de animación: la web usa 0.18s en transiciones de control. */
export const motion = { fast: 180, base: 240, slow: 400 } as const;
