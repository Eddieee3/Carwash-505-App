#!/usr/bin/env node
/**
 * Genera los íconos que exigen las tiendas A PARTIR DE LOS ARCHIVOS OFICIALES (no se redibuja el logo):
 *  - icon.png: el logo oficial cuadrado, convertido a PNG 1024×1024 (iOS / ícono general).
 *  - adaptive-foreground.png: el logo blanco centrado en un lienzo transparente 1024×1024, dentro de la
 *    zona segura del ícono adaptable de Android (círculo central de ~66 %). El fondo lo pone app.json (#05070a).
 *
 *   npm run brand:icons
 *
 * Un diseñador puede reemplazar estos archivos por versiones finales; app.json apunta a assets/brand/generated/.
 */
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const Jimp = require("jimp-compact"); // viene con Expo (@expo/image-utils)

const BRAND = resolve(dirname(fileURLToPath(import.meta.url)), "..", "assets", "brand");
const OUT = join(BRAND, "generated");
const SIZE = 1024;
const SAFE_WIDTH = Math.round(SIZE * 0.58); // ancho del logo dentro del círculo seguro

mkdirSync(OUT, { recursive: true });

const official = await Jimp.read(join(BRAND, "carwash505-logo-oficial.jpg"));
await official.resize(SIZE, SIZE).writeAsync(join(OUT, "icon.png"));

const white = await Jimp.read(join(BRAND, "carwash505-logo-blanco.png"));
white.resize(SAFE_WIDTH, Jimp.AUTO);
const canvas = new Jimp(SIZE, SIZE, 0x00000000);
canvas.composite(white, Math.round((SIZE - white.bitmap.width) / 2), Math.round((SIZE - white.bitmap.height) / 2));
await canvas.writeAsync(join(OUT, "adaptive-foreground.png"));

console.log(`brand-icons: icon.png y adaptive-foreground.png (${SIZE}×${SIZE}) en assets/brand/generated/`);
