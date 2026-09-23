# 3 · Stack técnico

Criterio: **reutilizar** todo lo posible del proyecto web (TypeScript, Supabase, Zod, tipos, i18n y tokens) y elegir librerías mantenidas por Expo o con soporte oficial para su *New Architecture*.

> Las versiones exactas se fijan al crear el proyecto con `npx create-expo-app@latest`. Se usa el SDK estable vigente en ese momento, no uno escrito aquí de memoria.

## 3.1 Núcleo

| Necesidad | Elección | Por qué |
|---|---|---|
| Framework | **Expo** (React Native, New Architecture) + **TypeScript estricto** | Un solo código para iOS y Android, el mismo lenguaje de la web, builds en la nube (EAS) sin necesitar una Mac |
| Navegación | **Expo Router** | Rutas por archivos, parecido al App Router de Next.js que ya usas. Deep links / Universal Links incluidos |
| Datos del servidor | **@supabase/supabase-js** + **TanStack Query** | El mismo cliente de la web. Query se encarga de caché, reintentos y persistencia offline |
| Estado local | **Zustand** (mínimo) | Solo para UI efímera (borrador de reserva). El resto vive en Query |
| Validación | **Zod** (misma versión mayor que la web) | Esquemas compartidos, por ejemplo `lead.ts` y `phone` E.164 |
| Formularios | **react-hook-form** + `@hookform/resolvers/zod` | Rendimiento en formularios largos |
| Sesión segura | **expo-secure-store** (adaptador de almacenamiento de Supabase Auth) | El token queda en Keychain/Keystore, no en AsyncStorage |
| Estilos | `StyleSheet` + `src/design/tokens.ts` + un `ThemeProvider` propio | Cero dependencias con versiones frágiles. Se puede evaluar **NativeWind** si se quiere escribir clases Tailwind como en la web |
| Animación | **react-native-reanimated** (+ `react-native-gesture-handler`) | El equivalente a Motion en la web |
| Imágenes | **expo-image** | Caché en disco, placeholders, AVIF/WebP |
| i18n | Diccionarios tipados como en la web + `expo-localization` | Mismo patrón (`es.ts` define el tipo) |
| Fechas | `Intl` + `date-fns-tz` | Zona `America/Managua` |

## 3.2 Capacidades nativas

| Función | Librería |
|---|---|
| Push | **expo-notifications** (FCM en Android, APNs en iOS) con acciones en la notificación (Asistiré / Tarde / Cancelar) |
| Cámara, QR | **expo-camera** (escaneo de códigos incluido) |
| Fotos | `expo-image-picker` + `expo-image-manipulator` (compresión y borrado de EXIF) |
| NFC | **react-native-nfc-manager** (requiere *development build*) |
| Ubicación | `expo-location`, solo en primer plano ("Llego en 10 min") |
| Abrir Waze / Maps / Instagram / WhatsApp | `expo-linking` (con URL oficial de BD) |
| Compartir / referidos | `expo-sharing` o `Share` de RN |
| Háptica | `expo-haptics` (confirmaciones, Spin-to-Win) |
| Biometría (opcional) | `expo-local-authentication` para abrir la wallet |

## 3.3 Backend (el mismo Supabase de la web)

| Pieza | Uso |
|---|---|
| Postgres + RLS | Nuevas tablas (ver doc 4). Reglas críticas en funciones RPC |
| `btree_gist` | Restricción de exclusión anti-overbooking |
| Realtime | Canales: disponibilidad del día, tablero del personal, dashboard |
| Storage | Bucket privado `service-evidence`, URLs firmadas |
| Edge Functions | `send-push`, `booking-reminders`, `campaign-runner`, `weather-sync`, `nfc-resolve`, `payments-webhook`, `export-report`, `no-show-score` |
| `pg_cron` | Programa recordatorios (cada min), clima (cada 3 h), campañas (diario) y puntajes (cada noche) |
| Clima | **Open-Meteo** (sin API key, uso no comercial gratuito; verificar licencia comercial o usar su plan pago) |
| Pagos | **Pendiente.** Ver doc 6: la pasarela depende de lo que opere con comercios en Nicaragua |

Las **membresías y gift cards son servicios físicos** consumidos fuera de la app. Por eso las reglas de App Store y Google Play permiten cobrarlos con una pasarela propia, sin compras in-app. Aun así, hay que confirmarlo contra las guías vigentes al publicar.

## 3.4 Calidad y entrega

| Área | Herramienta |
|---|---|
| Lint / formato | ESLint (`eslint-config-expo`) + Prettier |
| Tipos | `tsc --noEmit` en CI |
| Unit / componentes | **Jest** (`jest-expo`) + **React Native Testing Library** |
| SQL / RLS | Se amplía `tests/integration/rls.test.ts` de la web (PGlite): overbooking concurrente, permisos por rol, libro de puntos |
| E2E móvil | **Maestro** (flujos en YAML: reservar, check-in, Kanban) |
| Errores en producción | **Sentry** (`@sentry/react-native`), sin datos personales en los eventos |
| Builds | **EAS Build** (perfiles `development`, `preview`, `production`) |
| Actualizaciones | **EAS Update** solo para JS/estilos. Todo cambio nativo pasa por las tiendas |
| Secretos | Solo `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` en la app. El resto vive en las Edge Functions |

## 3.5 Código compartido web ↔ app

Hoy `Car Wash 505` y `Car Wash 505 App` son carpetas separadas. Hay dos caminos:

1. **Corto plazo (recomendado para empezar):** un script `scripts/sync-shared.mjs` en la app copia desde la web `src/types/database.ts`, `src/lib/validation/*`, `src/i18n/*` y los tokens, y avisa si hay diferencias. Es simple y no toca la web.
2. **Mediano plazo:** un monorepo con npm workspaces (`apps/web`, `apps/mobile`, `packages/shared`). Es más limpio, pero implica mover la web. Conviene hacerlo cuando la app llegue a la F2.

Además, los tipos de la BD se generan con `supabase gen types typescript` para ambos proyectos desde el mismo esquema.

## 3.6 Estructura de carpetas propuesta

Así quedó tras la F0 (Expo SDK 57 pone las rutas en `src/app`):

```
Car Wash 505 App/
├─ src/
│  ├─ app/                   # Expo Router (solo pantallas)
│  │  ├─ _layout.tsx         # fuentes, proveedores, Stack.Protected por rol
│  │  ├─ index.tsx           # redirige a la zona del rol
│  │  ├─ (auth)/             # welcome, login, verify (OTP)
│  │  ├─ (client)/           # pestañas: home, profile (F1+: reservar, wallet)
│  │  ├─ (staff)/            # today (F1: tablero)
│  │  ├─ (owner)/            # dashboard (F1: pestañas)
│  │  ├─ setup.tsx  no-access.tsx
│  │  └─ t/[tagId].tsx       # F7: destino de NFC/QR (deep link)
│  ├─ design/                # tokens.ts, theme, fonts, components
│  ├─ features/              # auth (F0); booking, garage, wallet, kanban… en fases siguientes
│  ├─ api/                   # cliente Supabase, sesión en SecureStore por trozos
│  ├─ lib/  i18n/
│  └─ shared/                # generado por scripts/sync-shared.mjs desde la web
├─ assets/brand/             # logos oficiales + generated/ (íconos derivados, scripts/brand-icons.mjs)
├─ e2e/                      # flujos Maestro
├─ jest/                     # sustitutos de módulos nativos para Jest
├─ scripts/  docs/
└─ app.json  (eas.json en la F7)
```

Notas de la F0:
- **Sesión:** la guía de Expo sugiere `expo-sqlite/localStorage` (sin cifrar). Se usa SecureStore con el valor partido en trozos de 1800 caracteres (`src/api/chunked-storage.ts`), porque SecureStore limita cada valor a ~2 KB.
- **Formularios:** en la F0 bastan `useState` + Zod. `react-hook-form` queda instalado para los formularios largos (garage, perfil).
