# Car Wash 505 · App móvil

App móvil complementaria del sitio web `../Car Wash 505` (Next.js 16 + Supabase). Comparte la **misma base de datos, la misma identidad visual y las mismas reglas de contenido**.

Estado: **F7 hecha en lo que no requiere backend** (enlaces `/t/<id>` y archivos de Universal/App Links en la web, perfiles de EAS, guía de publicación): ver [F0](docs/progreso/F0.md) … [F7](docs/progreso/F7.md). **Sin backend todavía**: lo pendiente, empezando por el backend, está en [PENDIENTES](docs/PENDIENTES.md); publicar en tiendas: [07-publicacion](docs/07-publicacion.md).

**Todo lo pendiente (decisiones, autorizaciones, despliegue, pruebas): [docs/PENDIENTES.md](docs/PENDIENTES.md).**

## Puesta en marcha

```bash
npm install
cp .env.example .env        # claves públicas de Supabase (las mismas de la web)
npm start                   # Expo; abre en un development build o en el navegador (w)
```

Sin `.env` la app arranca y muestra "Configuración pendiente" (como la web sin Supabase).

| Comando | Qué hace |
|---|---|
| `npm run typecheck` / `lint` / `test` | TypeScript, ESLint, Jest |
| `npm run sync:shared` / `sync:check` | Copia desde la web los tipos de BD y `site.ts` / verifica que no difieran y que los colores coincidan |
| `npm run brand:icons` | Regenera los íconos de tienda desde los logos oficiales |
| `npm run test:e2e` | Flujos Maestro (requiere development build + Supabase local) |

## Documentos

| # | Documento | Contenido |
|---|---|---|
| 1 | [Arquitectura](docs/01-arquitectura.md) | Capas, cómo se conecta con Supabase y la web, roles, motor de reservas, NFC/deep links, automatizaciones |
| 2 | [Sistema de diseño](docs/02-sistema-de-diseno.md) | Tokens heredados de la web, tipografía, componentes, pantallas por rol |
| 3 | [Stack técnico](docs/03-stack-tecnico.md) | Librerías elegidas y por qué |
| 4 | [Modelo de datos](docs/04-modelo-de-datos.md) | Tablas nuevas, restricciones anti-overbooking, RLS |
| 5 | [Plan de desarrollo](docs/05-plan-de-desarrollo.md) | Fases, entregables y criterios de aceptación |
| 6 | [Decisiones pendientes](docs/06-decisiones-pendientes.md) | Lo que el negocio debe confirmar antes de construir cada fase |

Tokens de diseño listos para usar: [`src/design/tokens.ts`](src/design/tokens.ts) (copiados 1:1 de `../Car Wash 505/src/styles/tokens.css`).

Reglas para agentes y colaboradores: [AGENTS.md](AGENTS.md).

## Resumen en una página

- **Plataforma:** Expo (React Native + TypeScript estricto) con Expo Router → Android e iOS desde un solo código.
- **Backend:** el mismo proyecto Supabase de la web. Se añaden tablas de clientes, vehículos, bahías, reservas, fidelización, marketing y operación, siempre con migración + rollback + prueba RLS, como exige la web.
- **Tiempo real:** Supabase Realtime para disponibilidad de bahías, tablero Kanban del personal y dashboard del propietario.
- **Anti-overbooking:** la base de datos lo garantiza (restricción de exclusión por bahía y rango horario), no la app.
- **Automatizaciones:** Supabase Edge Functions + `pg_cron` (recordatorio T-90 min, no-shows, clima, inactividad, cumpleaños).
- **Roles:** Cliente, Colaborador (`operator`) y Propietario (`super_admin`). `editor` y `viewer` siguen existiendo para el panel web.
- **Fases:** 8 fases, de la F0 (fundaciones) a la F7 (NFC y publicación en tiendas). La F1 ya es un MVP usable: reservas con capacidad real y un tablero para el personal.
