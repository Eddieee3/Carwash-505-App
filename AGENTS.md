# Car Wash 505 App · Reglas del proyecto

App móvil (Expo + React Native + TypeScript estricto) que comparte backend Supabase e identidad visual con `../Car Wash 505` (web). Leer también `../Car Wash 505/AGENTS.md`: sus reglas de contenido aplican aquí igual.

## Contenido (heredado de la web, no negociable)

- **No inventar contenido del negocio.** Solo se muestra lo confirmado en `../Car Wash 505/docs/content-status.md` o en la base de datos. Lo que sea `null` se oculta.
- Precios, planes de membresía, beneficios VIP, duraciones y enlaces (Instagram, Waze, Google Maps) salen **solo** de la BD o de la configuración central. Nunca van escritos en componentes.
- Prohibido: PPF, reseñas/estrellas públicas, cifras de clientes, garantías o duraciones no confirmadas, enlaces `tel:`, exclusividad/certificación Nytrox.
- El logo nunca se recrea: solo los archivos oficiales de `../Car Wash 505/public/media/brand/`.

## Arquitectura

- `src/app/` rutas (Expo Router) agrupadas por rol: `(auth)`, `(client)`, `(staff)`, `(owner)`. Cada grupo solo existe para su rol (`Stack.Protected` en `src/app/_layout.tsx`, a partir de `resolveView`). Solo pantallas en `src/app/`: nada de tests ni utilidades ahí.
- `src/shared/` lo genera `npm run sync:shared` desde la web (tipos de BD y `site.ts`). No se edita a mano; `npm run sync:check` detecta diferencias.
- Expo SDK 57: `Tabs` se importa de `expo-router/js-tabs`. Antes de usar una API de Expo, consultar https://docs.expo.dev/versions/v57.0.0/ (cambia entre versiones). Instalar paquetes con `npx expo install`.
- `src/design` tokens y componentes base · `src/features/<dominio>` pantallas, hooks y lógica · `src/lib` utilidades puras · `src/api` acceso a Supabase y Edge Functions · `src/i18n` diccionarios (ES por defecto, EN).
- La app **nunca** decide permisos ni precios: los decide la base de datos (RLS, funciones RPC) o las Edge Functions. La UI solo oculta lo que el servidor igual rechazaría.
- Nada de `service_role` en la app. Solo la clave `anon` + sesión del usuario.
- Horas: se guardan en UTC (`timestamptz`) y se muestran en `America/Managua`.

## Flujo de trabajo

- Antes de dar algo por terminado: `npm run lint`, `npm run typecheck`, `npm test`, `npm run sync:check`, `npx expo-doctor`, y la prueba E2E (Maestro) del flujo tocado.
- Cambios de BD: se hacen en el repo web (`supabase/migrations` + `supabase/rollback` + `tests/integration/rls.test.ts`), que es el dueño del esquema.
- No hacer commit, push, build de tienda ni envío de notificaciones reales sin autorización.
