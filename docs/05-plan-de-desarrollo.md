# 5 · Plan de desarrollo

El requerimiento es grande. Construirlo todo a la vez es la forma más segura de no terminar nada. Se divide en **8 fases**, cada una **publicable y útil por sí sola**, en orden de valor para el negocio.

Cada fase termina con:
- lint + typecheck + pruebas unitarias
- pruebas RLS de las tablas nuevas
- flujo E2E en Maestro
- revisión en un dispositivo Android real

Las duraciones son estimaciones para **una persona** con dedicación parcial. Se ajustan tras la F1.

## F0 · Fundaciones (1–2 semanas)

- Crear el proyecto Expo (TypeScript estricto, Expo Router, ESLint, Jest, Maestro) y el perfil `development` de EAS.
- `ThemeProvider` + `src/design/tokens.ts` + fuentes Saira Condensed / Figtree + componentes base (`Button`, `Text`, `Card`, `Field`, `StatusBadge`, `EmptyState`).
- Cliente Supabase con sesión en `expo-secure-store`. Login OTP y redirección por rol (`customer` / `operator` / `super_admin`).
- `scripts/sync-shared.mjs` (tipos, validación, i18n y tokens desde la web).
- Migración 0007: `customers`, `vehicles`, rol `operator`, cambio del trigger de alta + pruebas RLS.

**Aceptación:**
- Un cliente se registra y entra a su pestaña de Inicio.
- Un operador invitado entra a **Hoy**.
- Un cliente nunca obtiene `profiles`.

## F1 · MVP de reservas en tiempo real (3–4 semanas)

- Garage virtual (CRUD de vehículos, vehículo por defecto).
- Catálogo desde `services` (precio solo si existe en BD, si no: "Requiere evaluación / WhatsApp").
- `bays`, `bookings` con restricción de exclusión, `available_slots`, `book_slot`, `cancel_booking`.
- `SlotPicker` con refresco en vivo (Realtime).
- Tablero **Hoy** del operador: pestañas por estado, `advance_booking` y asignación de bahía/empleado.
- Dashboard mínimo del propietario: ocupación % del día y reservas por estado.
- Cierre por clima (bahías `wash` cerradas, `detail` abiertas).

**Aceptación:**
- 50 reservas concurrentes simuladas sobre 1 franja → 0 overbooking.
- El operador ve una reserva nueva en menos de 2 s.

## F2 · Confirmación, llegada y evidencia (2–3 semanas)

- Push (`expo-notifications` + `send-push`) con acciones **Asistiré / Llegaré tarde / Cancelar**.
- `pg_cron`: recordatorio a T-90, cierre de ventana a T-60, no-show a T+15.
- "Llego en 10 min" y botones Waze/Maps (visibles solo con URL oficial).
- Fotos antes/después/daños (bucket privado, compresión, sin EXIF). Galería en el historial del cliente.
- Historial + **Repetir lavado**.
- Tickets de soporte y reporte de daños preexistentes con fotos.
- Estimador de tiempo (se muestra solo con duraciones medidas).

**Aceptación:**
- Una reserva a las 10:00 recibe el push a las 08:30 (hora de Managua).
- Sin check-in a las 10:15 pasa a `no_show`.

## F3 · Fidelización básica (2–3 semanas)

- `loyalty_ledger`, puntos por reserva completada y por reseña **interna**.
- Badges (10 reservas, asistencia perfecta, VIP).
- Wallet: saldo, nivel, badges y **QR rotativo**. Escáner QR del operador.
- Tarjeta VIP digital (según las reglas que confirme el negocio en `vip_program`).
- Referidos con código y enlace para compartir.

**Aceptación:** los puntos cuadran con la suma del libro. Ninguna ruta permite editar el saldo.

## F4 · Pagos, membresías y gift cards (3–4 semanas, **bloqueada** por la decisión de pasarela)

- Integración de la pasarela elegida (Edge Function + webhook idempotente).
- Planes Free/Gold/Platinum con cobro recurrente (solo si `membership_plans.price` ≠ null).
- Gift cards: compra, código, saldo y transferencia con aceptación.
- Spin-to-Win (sorteo en servidor, una vez por reserva, respeta "reducir movimiento").

**Aceptación:** un webhook duplicado no cobra ni acredita dos veces.

## F5 · Tarifas dinámicas, upselling y marketing automático (2–3 semanas)

- `pricing_rules` + `quote_price()` con desglose visible y tope de ajuste.
- Productos/extras en el resumen de reserva, con recomendación por historial del vehículo.
- `weather-sync` (Open-Meteo) y `campaign-runner`: clima, inactividad 14/30 días, cumpleaños, ocupación real.
- Retos mensuales y promociones flash.
- Límites de frecuencia, horario de silencio y consentimiento de marketing.

**Aceptación:** con una simulación de lluvia ≥ 70 %, solo los clientes con consentimiento reciben 1 push como máximo.

## F6 · Operación y analítica del propietario (2–3 semanas)

- Dashboard completo en vivo: ocupación, ingresos, VIP presentes, alertas de no-show.
- Puntaje de no-show por reglas (explicable), restricciones con revisión humana.
- Inventario de insumos (consumo por el operador, compras por el propietario, alertas de mínimo).
- Tareas de mantenimiento del personal.
- Reportes PDF/Excel (Edge Function + enlace firmado).

## F7 · NFC, comunidad y publicación (2 semanas + revisión de tiendas)

- Ruta web `/t/[tagId]` en Next.js (redirección a la tienda por plataforma) + `apple-app-site-association` + `assetlinks.json`.
- `nfc-resolve`: check-in/perfil → Instagram oficial (si hay URL).
- Lectura NFC del operador (`react-native-nfc-manager`).
- Tips de cuidado (contenido desde el panel web) y compartir en Instagram/WhatsApp.
- Fichas de tienda, política de privacidad (la de la web, revisada legalmente), capturas, TestFlight / prueba interna de Play y envío a revisión.

**Requisitos externos:**
- Dominio de producción.
- Cuenta de Apple Developer (USD 99/año).
- Cuenta de Google Play (USD 25, pago único).
- Textos legales aprobados.

## Resumen de dependencias

```
F0 ─► F1 ─► F2 ─► F3 ─► F4 (pasarela)
            │     └────► F5 ─► F6
            └──────────────────────► F7 (dominio + cuentas de tienda)
```

## Cómo se controla cada fase (harness)

Por fase se usa el mismo ciclo: **descubrir estado → construir lo mínimo → correr las pruebas → dejar nota de entrega**. La nota va en `docs/progreso/F<n>.md` e incluye:
- qué se hizo
- evidencia (salida de pruebas, capturas)
- qué quedó bloqueado
- siguiente paso

Un harness automatizado (script) solo se justifica si una tarea se repite. Ejemplo: `sync-shared.mjs` y la prueba de concurrencia de reservas, que se corre en cada cambio del motor.
