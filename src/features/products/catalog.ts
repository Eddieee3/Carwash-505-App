import type { ImageSourcePropType } from "react-native";

/**
 * Productos que vende Car Wash 505 en el local (fotos de la carpeta "catalogo", 2026-09-24).
 * Solo se transcribe lo que dice cada etiqueta. Los precios de las fotos no son legibles:
 * se consultan por WhatsApp (nunca se inventan). Imágenes con fondo transparente: fotos oficiales de cada marca
 * cuando coinciden con lo que se vende (Meguiar's, Paradise, Formula 1, Nytrox, Klear, ABRO); si no, la foto del local recortada.
 */
export type ProductCategory = "fragrance" | "exterior" | "interior" | "ceramic" | "safety";

export type Product = {
  id: string;
  brand: string;
  name: string;
  category: ProductCategory;
  description: string;
  variants: string[];
  image: ImageSourcePropType;
};

export const PRODUCT_CATEGORIES: ProductCategory[] = ["fragrance", "exterior", "interior", "ceramic", "safety"];

export const PRODUCTS: Product[] = [
  {
    id: "super-organic",
    brand: "Paradise",
    name: "Super Organic",
    category: "fragrance",
    description: "Ambientador extra fuerte para debajo del asiento.",
    variants: ["Tsunami", "Blue Lava", "Vanilla Frosting", "Cran Burst", "Pure Sunshine", "Gold", "Tropic Twist", "Strawberry"],
    image: require("@/assets/products/super-organic.png"),
  },
  {
    id: "gel-90",
    brand: "Paradise Platinum",
    name: "Ultimate Gel 90",
    category: "fragrance",
    description: "Ambientador en gel, 15 veces más fragancia según su etiqueta.",
    variants: ["Black Cherry", "Tropic Twist"],
    image: require("@/assets/products/gel-90.png"),
  },
  {
    id: "platinum-spray",
    brand: "Paradise Platinum",
    name: "Odor Eliminating Air Freshener",
    category: "fragrance",
    description: "Ambientador en spray que elimina olores. Varios aromas.",
    variants: ["Cherry", "New Car", "Tropic Twist"],
    image: require("@/assets/products/platinum-spray.png"),
  },
  {
    id: "air-refresher",
    brand: "Meguiar's",
    name: "Air Re-Fresher",
    category: "fragrance",
    description: "Spray que combate los olores con un aroma duradero.",
    variants: ["New Car", "Black Chrome"],
    image: require("@/assets/products/air-refresher.png"),
  },
  {
    id: "areon",
    brand: "Areon",
    name: "Perfumes para auto",
    category: "fragrance",
    description: "Colgantes y difusores de madera en varios aromas.",
    variants: [],
    image: require("@/assets/products/areon.png"),
  },
  {
    id: "colgantes",
    brand: "Little Trees · Areon · Saint Ciel",
    name: "Ambientadores colgantes",
    category: "fragrance",
    description: "Ambientadores para colgar, en varios aromas.",
    variants: [],
    image: require("@/assets/products/colgantes.png"),
  },
  {
    id: "quik-detailer",
    brand: "Meguiar's",
    name: "Quik Detailer",
    category: "exterior",
    description: "Detallador rápido: rocía y limpia.",
    variants: [],
    image: require("@/assets/products/quik-detailer.png"),
  },
  {
    id: "cleaner-wax",
    brand: "Meguiar's",
    name: "Cleaner Wax",
    category: "exterior",
    description: "Limpia, pule y protege en un solo paso.",
    variants: [],
    image: require("@/assets/products/cleaner-wax.png"),
  },
  {
    id: "bug-remover",
    brand: "Meguiar's",
    name: "Foaming Bug Remover",
    category: "exterior",
    description: "Espuma para quitar restos de insectos.",
    variants: [],
    image: require("@/assets/products/bug-remover.png"),
  },
  {
    id: "formula1-color-wax",
    brand: "Formula 1",
    name: "Color Wax Ceramic Spray",
    category: "exterior",
    description: "Cera cerámica con color en spray.",
    variants: ["Negro", "Blanco"],
    image: require("@/assets/products/formula1-color-wax.png"),
  },
  {
    id: "formula1-carnauba",
    brand: "Formula 1",
    name: "Carnauba Car Wax",
    category: "exterior",
    description: "Cera de carnauba en pasta.",
    variants: [],
    image: require("@/assets/products/formula1-carnauba.png"),
  },
  {
    id: "klear-neutralizador-grande",
    brand: "Klear",
    name: "Neutralizador de olores",
    category: "interior",
    description: "Presentación grande con atomizador.",
    variants: [],
    image: require("@/assets/products/klear-neutralizador-grande.png"),
  },
  {
    id: "klear-neutralizador",
    brand: "Klear",
    name: "Neutralizador de olores (spray)",
    category: "interior",
    description: "Presentación de bolsillo.",
    variants: [],
    image: require("@/assets/products/klear-neutralizador.png"),
  },
  {
    id: "klear-vidrios",
    brand: "Klear",
    name: "Limpiador para vidrios",
    category: "interior",
    description: "Glass cleaner en spray.",
    variants: [],
    image: require("@/assets/products/klear-vidrios.png"),
  },
  {
    id: "nytrox-booster",
    brand: "Nytrox",
    name: "The Booster",
    category: "ceramic",
    description: "Spray cerámico.",
    variants: [],
    image: require("@/assets/products/nytrox-booster.png"),
  },
  {
    id: "nytrox-graphene",
    brand: "Nytrox",
    name: "Graphene 02",
    category: "ceramic",
    description: "Recubrimiento cerámico con grafeno.",
    variants: [],
    image: require("@/assets/products/nytrox-graphene.png"),
  },
  {
    id: "nytrox-nx33",
    brand: "Nytrox",
    name: "NX-33",
    category: "ceramic",
    description: "Recubrimiento cerámico.",
    variants: [],
    image: require("@/assets/products/nytrox-nx33.png"),
  },
  {
    id: "nytrox-nitroforce",
    brand: "Nytrox",
    name: "Nytroforce",
    category: "ceramic",
    description: "Recubrimiento cerámico.",
    variants: [],
    image: require("@/assets/products/nytrox-nitroforce.png"),
  },
  {
    id: "extintor",
    brand: "ABRO Masters",
    name: "Extintor para auto",
    category: "safety",
    description: "Extintor de incendios en aerosol.",
    variants: [],
    image: require("@/assets/products/extintor.png"),
  },
];

/** Normaliza para buscar sin tildes ni mayúsculas ("Meguiar's" = "meguiars"). */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\p{M}']/gu, "")
    .toLowerCase();

/** P02: búsqueda por nombre o marca, combinada con la categoría. */
export function filterProducts(list: Product[], category: ProductCategory | "all", query: string): Product[] {
  const q = norm(query.trim());
  return list.filter((p) => (category === "all" || p.category === category) && (!q || norm(`${p.brand} ${p.name}`).includes(q)));
}
