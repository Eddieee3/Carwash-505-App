#!/usr/bin/env node
/**
 * Copia desde el proyecto web las fuentes únicas que la app comparte y verifica la paridad de marca.
 *
 *   npm run sync:shared   → escribe src/shared/*
 *   npm run sync:check    → no escribe; falla si src/shared/* o los colores difieren de la web (para CI)
 *
 * La web es la dueña de estos archivos: aquí nunca se editan a mano.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = process.env.CW505_WEB_DIR ?? resolve(APP, "..", "Car Wash 505");
const check = process.argv.includes("--check");

const FILES = [
  { from: "src/config/site.ts", to: "src/shared/site.ts" },
  {
    from: "src/types/database.ts",
    to: "src/shared/database.ts",
    transform: (src) => src.replace('from "@/config/site"', 'from "./site"'),
  },
];

if (!existsSync(WEB)) {
  console.error(`sync-shared: no se encontró el proyecto web en ${WEB} (define CW505_WEB_DIR).`);
  process.exit(1);
}

const problems = [];

for (const { from, to, transform = (s) => s } of FILES) {
  const header = `// GENERADO por scripts/sync-shared.mjs desde "Car Wash 505/${from}". No editar a mano.\n`;
  const next = header + transform(readFileSync(join(WEB, from), "utf8"));
  const target = join(APP, to);
  const current = existsSync(target) ? readFileSync(target, "utf8") : null;
  if (current === next) continue;
  if (check) {
    problems.push(`${to} no coincide con la web (ejecuta npm run sync:shared)`);
  } else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, next);
    console.log(`sync-shared: ${to} actualizado`);
  }
}

// Paridad de marca: cada color de tokens.css de la web debe existir en los tokens de la app.
const webColors = new Set(readFileSync(join(WEB, "src/styles/tokens.css"), "utf8").toLowerCase().match(/#[0-9a-f]{6}\b/g) ?? []);
const appTokens = readFileSync(join(APP, "src/design/tokens.ts"), "utf8").toLowerCase();
for (const color of webColors) {
  if (!appTokens.includes(color)) problems.push(`el color ${color} de la web no está en src/design/tokens.ts`);
}

if (problems.length > 0) {
  for (const p of problems) console.error(`sync-shared: ${p}`);
  process.exit(1);
}
console.log(`sync-shared: OK (${FILES.length} archivos, ${webColors.size} colores de marca)`);
