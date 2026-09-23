# Pendientes · Car Wash 505 (app + web)

**Única lista viva de lo que falta.** Las notas de cada fase (`docs/progreso/F*.md`) cuentan qué se hizo; aquí queda solo lo pendiente. Al resolver algo, se borra de aquí.

Última actualización: 2026-09-24 (F7 hecha en lo que no requiere backend).

---

## 0. Primero: el backend (API)

**Hoy no hay backend en producción.** Todo lo que la app lee y escribe pasa por Supabase (base de datos, Auth, Storage y Edge Functions). Hasta crearlo:
- La app solo muestra la pantalla de configuración pendiente.
- La web funciona con sus datos locales confirmados; el panel queda en "Configuración pendiente".

Pasos (detalle en §3):
1. Crear el proyecto Supabase.
2. Aplicar las migraciones 7–14.
3. Configurar Auth.
4. Desplegar las Edge Functions.
5. Poner las claves en `.env` de web y app.

Quedó **preparado y esperando el backend**:
- `supabase/drafts/20260924000015_nfc_tips.sql` (F7): resolución de tags NFC (check-in, perfil, Instagram, tarjeta VIP) y tips de cuidado. No se aplica todavía.
  - Al pasarlo a `migrations/` hay que escribir sus pruebas.
  - Luego vienen: la ruta `/t/[tagId]` en la app, la lectura NFC del colaborador (`react-native-nfc-manager`), la pantalla de tips con "Compartir", y en el panel las secciones de tags NFC y tips.
- **Eliminar la cuenta desde la app** (#20): obligatorio para publicar; necesita una Edge Function.

## 1. Decisiones del negocio

Mientras falten, la función queda **apagada u oculta**. Nunca se inventa un valor.

| # | Qué falta decidir | Dónde se carga | Qué pasa mientras tanto |
|---|---|---|---|
| 1 | Cuántas **bahías** hay y de qué tipo (lavado / detallado) | Panel → *Bahías* | No hay horas disponibles para reservar |
| 2 | **Duración interna** de cada servicio (auto y SUV) | Panel → *Servicios → Reservas en la app* | El servicio no se puede marcar como reservable |
| 3 | Qué servicios se pueden **reservar** en la app | Panel → *Servicios → Reservable en la app* | La app muestra "Aún no hay servicios reservables" |
| 4 | Confirmar la regla si el cliente **no responde** al recordatorio | Panel → *Información del negocio* (tiempos) | **Provisional:** se mantiene la reserva ("Sin respuesta"); no-show a los 15 min |
| 5 | Confirmar qué hace **"Llegaré tarde"** | — | **Provisional:** solo avisa; tolerancia de 15 min |
| 6 | Método de **inicio de sesión**: correo, SMS o WhatsApp | Configuración de Supabase Auth | **Provisional:** código por correo |
| 7 | **Pasarela de pagos** que opere con comercios en Nicaragua (con cobro recurrente) | Integración en la F4 | Solo **pago en el local**, confirmado por el personal |
| 8 | **Precios, beneficios y % de descuento** de Free / Gold / Platinum | Panel → *Membresías (app)* | Los planes no se pueden solicitar; sin % no hay descuento en las reservas |
| 9 | Reglas de la **Tarjeta VIP** (visitas, servicios, beneficio, vigencia) | Panel → *Tarjeta VIP* | Sin VIP automático |
| 10 | **Puntos** por acción y **catálogo de canje** | Panel → *Puntos (app)* y *Premios (app)* | Programa apagado. Umbral provisional de "Asistencia Perfecta": 5 servicios sin faltar |
| 11 | **Premios de la ruleta** y sus probabilidades, con revisión legal (promociones y sorteos) | Panel → *Pagos, gift cards y ruleta (app)* y *Premios de la ruleta* | Ruleta apagada |
| 12 | **Montos** de gift card que se venden | Panel → *Pagos, gift cards y ruleta (app)* | No se venden gift cards |
| 13 | **Tarifas dinámicas**: tope, horas pico/valle, % por clima, promos flash | Panel → *Tarifas dinámicas (app)* y *Reglas de tarifa (app)* | Precio fijo del servicio |
| 13a | **Extras** que se venden al reservar (nombre, precio, con qué servicios) | Panel → *Extras de la reserva (app)* | No se ofrecen extras |
| 13b | **Campañas**: textos, disparadores, % de cupón; máximo de avisos por semana y horario de silencio | Panel → *Marketing (app)* y *Campañas automáticas (app)* | No se envía ningún aviso de marketing |
| 13c | **Retos** (meta, puntos, período) | Panel → *Retos (app)* | Sin retos (además requieren los puntos activos, #10) |
| 13d | **Clima**: coordenadas del local para el pronóstico y revisar la licencia comercial de Open-Meteo | Secretos de `weather-sync` | Reglas y campañas de clima no aplican |
| 13e | **Pesos del riesgo de no-show** (valores iniciales propuestos: 25 por no-show, 20 sin respuesta, 10 tarde / primera visita / anticipación / lluvia; alerta desde 50) | Panel → *Riesgo de no-show (app)* | Se usan los propuestos; el puntaje solo avisa |
| 13f | **Insumos** (nombre, unidad, mínimo) y **tareas** de mantenimiento | Panel → *Insumos (app)* y *Tareas de mantenimiento (app)* | Pantallas vacías |
| 13g | Política de **restricciones** de clientes (cuándo y por cuánto tiempo; máx. 365 días) | Panel → *Restricciones de clientes (app)* | Nadie está restringido |
| 14 | **Dominio** de producción | Hosting | Sin Universal Links ni NFC (F7) |
| 15 | URL oficial de **Instagram, Waze y Google Maps** | Panel → *Información del negocio* | Los botones "Cómo llegar" no aparecen |
| 16 | **Textos legales** revisados (privacidad y términos; Ley 787) | Web | Borrador visible; bloquea publicar en tiendas |
| 17 | Aprobar los colores de estado `success` y `danger` | `src/design/tokens.ts` | Se usan los propuestos |
| 18 | Confirmar el amarillo `signal` desde el logo oficial | Web y app | Valor provisional |
| 19 | Identificador de la app (`com.carwash505.app`) | `app.json` | Provisional. **No se puede cambiar después de publicar** |
| 20 | **Eliminar la cuenta** desde la app (exigido por Apple y Google) | Backend (Edge Function) + pantalla en Perfil | Bloquea publicar en tiendas |
| 21 | **Ficha de tienda**: descripción corta y larga, categoría, correo de soporte, capturas | App Store Connect / Play Console (`docs/07-publicacion.md`) | Sin publicar |
| 22 | URLs oficiales de la app en **App Store y Google Play** (tras publicar) | Web → `BUSINESS.links.appStore/playStore` | `/t/<id>` lleva al inicio del sitio |

## 2. Autorizaciones que necesito de ti

| Qué | Por qué | Efecto si no |
|---|---|---|
| Editar `eslint.config.js` de la app (una línea: el resolvedor TypeScript) | ESLint no entiende el alias `@/`; el hook `config-protection` bloquea el cambio | `npm run lint` marca todos los `import` con `@/` (falsos positivos). TypeScript y Metro sí funcionan |
| Renombrar la carpeta `Car Wash 505 (2)` sin paréntesis | Los paréntesis rompen cómo jest-expo encuentra los mocks nativos | Cada módulo nativo nuevo que se pruebe puede necesitar un sustituto en `jest/` |
| Corregir las **13 pruebas viejas de la web** | Ya fallaban antes de la app: seed (5 servicios), `currency` en el panel, horario 17:00 → 18:00, FAQ | La suite web nunca queda en verde |
| Hacer **commits** | No se ha hecho ninguno (web ni app) | Todo el trabajo existe solo en disco |

## 3. Despliegue (nada se ha aplicado en un entorno real)

1. Aplicar las migraciones **7 a 14** en el Supabase real (`supabase db push`), después de un backup.
2. Auth: registro habilitado, plantillas *Magic Link* y *Confirm signup* con `{{ .Token }}`, SMTP propio (`docs/deployment.md` de la web).
3. Primer `super_admin` con el nuevo procedimiento (invitar → insertar en `profiles`).
4. Extensiones **pg_cron** y **pg_net**; programar `booking-automation` y `send-push` (`docs/deployment.md`).
5. Desplegar las Edge Functions **`send-push`** (con `CRON_SECRET`) y **`owner-report`** (reportes; con verificación de JWT) y, tras #13d, **`weather-sync`** (`docs/deployment.md` de la web).
6. Proyecto **EAS** (`npx eas-cli init` → `projectId`, necesario para push); cuentas de Apple Developer (USD 99/año) y Google Play (USD 25). Los perfiles de build ya están en `eas.json` (ver `docs/07-publicacion.md`).
7. En la app, `.env` con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
8. Revisar la licencia de **Open-Meteo** para uso comercial antes de programar `weather-sync` (#13d).
9. Con el dominio (#14): variables `APPLE_TEAM_ID`, `IOS_BUNDLE_ID`, `ANDROID_PACKAGE`, `ANDROID_SHA256_CERT_FINGERPRINTS` en la web, y `associatedDomains` / `intentFilters` en `app.json` (plantilla en `docs/07-publicacion.md` §4).

## 4. Pruebas que no se pudieron ejecutar aquí

Faltan emulador, Docker, Deno y Maestro en esta sesión.

| Qué | Cómo probarlo |
|---|---|
| Todo en un **teléfono real** (login, reservar, tablero, fotos, wallet, escaneo) | `npx expo run:android` con Supabase local |
| Flujos E2E `e2e/01-login-otp.yaml` y `e2e/02-booking.yaml` | `npm run test:e2e` |
| **50 reservas simultáneas** reales (la exclusión ya está probada en PGlite) | Script contra `supabase start` |
| **Push real** (recordatorio con botones, aviso de no-show) | Development build + `send-push` desplegada |
| Edge Function `send-push` en Deno (su lógica pura sí está probada) | `supabase functions serve send-push` |
| Cámara: fotos antes/después y escaneo del QR | Dispositivo físico |
| Pago en el local de punta a punta (F4) | Dispositivo físico con personal y cliente |
| Reserva con extras, cupón y desglose; promos y retos en pantalla (F5) | `npx expo run:android` con Supabase local y datos de prueba en el panel |
| Edge Function `weather-sync` contra Open-Meteo (su lógica pura sí está probada) | `supabase functions serve weather-sync` con coordenadas |
| Aviso de marketing real en el canal "Promociones" de Android | Development build + `send-push` + campaña activa |
| Reporte PDF/CSV de punta a punta (Edge Function `owner-report` + Storage + enlaces firmados); abrir el CSV en Excel | `supabase functions serve owner-report` o proyecto real |
| Dashboard, insumos y tareas en el teléfono (propietario y colaborador) | `npx expo run:android` con datos de prueba |
| Universal Links / App Links abriendo la app desde `https://<dominio>/t/<id>` | Con dominio, variables y un build firmado |

## 5. Después del backend

Las 7 fases del plan están hechas en código. Lo que queda es lo de §0 (backend), las decisiones de §1 y la publicación (`docs/07-publicacion.md`).
