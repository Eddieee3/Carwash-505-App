# 1 · Arquitectura

## 1.1 Vista general

```
┌────────────── App Expo (iOS / Android) ───────────────┐
│  Cliente      Colaborador (Kanban)      Propietario   │
│        └──────────── src/api ──────────────┘          │
└───────┬───────────────┬───────────────────┬───────────┘
        │ lecturas +    │ mutaciones con    │ pagos, push,
        │ Realtime (RLS)│ reglas (RPC SQL)  │ clima, reportes
        ▼               ▼                   ▼
┌──────────────────────── Supabase (mismo proyecto que la web) ─────────┐
│ Postgres + RLS · Auth · Storage · Realtime · Edge Functions · pg_cron │
└───────────────────────────────▲───────────────────────────────────────┘
                                │ mismo esquema, mismas reglas
                     Web Next.js (sitio público + panel /admin)
```

**Principio:** la base de datos es la única autoridad. La app pide y la BD decide. La capacidad, los precios finales, los puntos y los permisos se calculan en Postgres (RPC) o en Edge Functions, nunca en el teléfono.

### Tres canales de acceso

| Canal | Para qué | Ejemplo |
|---|---|---|
| **Lectura directa + Realtime** (Supabase JS con sesión del usuario, filtrado por RLS) | Catálogo, mis reservas, disponibilidad, tablero | `from('bookings').select()` + canal Realtime `bookings:bay_id` |
| **RPC SQL** (`security definer`, validan todo dentro de una transacción) | Operaciones con reglas de negocio | `book_slot()`, `confirm_attendance()`, `redeem_points()`, `check_in()` |
| **Edge Functions** (Deno, con secretos) | Lo que necesita terceros o secretos | Cobros, envío push, clima, exportar PDF/Excel, validar tag NFC |

> La web usa Route Handlers con verificación de `Origin` (CSRF), que no aplica a una app nativa. Por eso la app **no** llama a `/api/*` de Next.js: usa RPC y Edge Functions con el JWT del usuario (`Authorization: Bearer`).

## 1.2 Roles y acceso

La web ya tiene `profiles.role ∈ {super_admin, editor, viewer}` para el personal. Se amplía así:

| Rol del requerimiento | Implementación | Cómo se crea |
|---|---|---|
| **Cliente** | Tabla `customers` (1:1 con `auth.users`), **sin** fila en `profiles` | Autorregistro en la app (OTP por SMS/WhatsApp o correo) |
| **Colaborador** | `profiles.role = 'operator'` (nuevo valor) | Invitación desde el panel, igual que hoy |
| **Propietario** | `profiles.role = 'super_admin'` | Ya existe |
| (panel web) | `editor`, `viewer` | Sin cambios |

Hoy la web tiene el registro público **deshabilitado** (`supabase/config.toml`). La app necesita autorregistro de clientes. Se propone:
- Habilitar el registro con verificación por OTP.
- El trigger de alta de la web crea `profiles` con rol `viewer`. Hay que cambiarlo para que un alta desde la app cree **solo** `customers`. El personal debe seguir entrando únicamente por invitación.
- Resultado: un cliente nunca puede terminar con acceso al panel.

Matriz (se añade a `src/lib/auth/roles.ts` de la web y a las funciones SQL `is_staff()`, etc.):

| Permiso | Cliente | Colaborador | Propietario |
|---|:-:|:-:|:-:|
| Reservar, ver/cancelar **sus** reservas | ✅ | — | ✅ |
| Garage, wallet, historial, tickets propios | ✅ | — | — |
| Ver tablero del día, mover estados, subir fotos | — | ✅ | ✅ |
| Validar QR/NFC (VIP, membresía, gift card) | — | ✅ | ✅ |
| Datos personales completos del cliente | propio | nombre + vehículo + notas del servicio | ✅ |
| Precios, reglas dinámicas, campañas, blacklist | — | — | ✅ |
| Inventario (registrar consumo) | — | ✅ | ✅ |
| Inventario (compras, costos), reportes, finanzas | — | — | ✅ |

## 1.3 Motor de reservas

### Capacidad
- La tabla `bays` guarda las bahías físicas. Cada una tiene un `kind`: `wash` (lavado general) o `detail` (detallado).
- Cada servicio declara qué tipo de bahía necesita (`bay_kind`) y cuánto tiempo la ocupa (`duration_minutes`, **interno**: solo para agendar, no se publica mientras no esté confirmado).
- **Garantía anti-overbooking en la BD:** `bookings` tiene una restricción `EXCLUDE USING gist (bay_id WITH =, slot WITH &&)` para las reservas activas. Aunque dos clientes pidan el último espacio al mismo segundo, solo una inserción pasa.
- `book_slot(service_id, vehicle_id, starts_at, addons[])` elige una bahía libre del tipo correcto, calcula el precio con las reglas vigentes y devuelve la reserva o un error claro (`slot_taken`, `closed`, `customer_restricted`).
- La disponibilidad se lee con `available_slots(date, service_id)`, que genera franjas de 15 min dentro del horario de `business_settings` y resta las ocupadas. La app se suscribe a Realtime y refresca cuando cambia una reserva del día.

### Cierre por clima
- El propietario marca "cerrar lavado general" (con rango horario). Las bahías `wash` quedan cerradas y las `detail` siguen reservables (así se cumple "servicios especiales aun con mal clima").
- Las reservas afectadas reciben push con opción de reprogramar.

### Ciclo de vida de una reserva

```
pending ──confirm──► confirmed ──check_in──► checked_in ──start──► in_progress ──finish──► completed
   │                    │   ▲                                                               │
   │                    │   └── late (cliente avisó "llegaré tarde", dentro de tolerancia)  └─► spin-to-win, puntos, fotos
   └── cancelled ◄──────┘
                        └── no_show (sin check-in a los 15 min de la hora)
```

| Momento | Acción automática (pg_cron cada minuto + Edge Function) |
|---|---|
| T − 90 min | Push: "Tu cita es a las 10:30. ¿Asistirás?" con 3 acciones: **Asistiré / Llegaré tarde / Cancelar** |
| T − 90 → T − 60 min | Ventana de respuesta de 30 min |
| T − 60 min sin respuesta | Se marca `unconfirmed`; el personal lo ve resaltado. *(Qué más pasa lo decide el negocio, ver decisiones pendientes)* |
| T + 15 min sin check-in | `no_show`: se libera la bahía, suma al historial de no-shows y se avisa al propietario |

### Estimador "tu auto estará listo en X min"
`started_at + duración real media del servicio (últimas N ejecuciones medidas en esa bahía) − ahora`. Mientras no haya datos medidos no se muestra ningún número, solo el estado ("En proceso"), para cumplir la regla de no publicar duraciones sin confirmar.

### GPS
- "Cómo llegar" abre Waze o Google Maps **solo** con los enlaces oficiales de `business_settings` (hoy `null`, así que el botón no aparece).
- "Llego en 10 min": el cliente lo toca y el personal ve la hora estimada de llegada. No se hace rastreo continuo en segundo plano (evita permisos invasivos y el rechazo en tiendas).

## 1.4 Precios y tarifas dinámicas

Precio final = precio base de `services` (auto/SUV y moneda) → reglas de `pricing_rules` en orden (pico/valle, clima, promo flash, membresía) → gift card / puntos.

- Lo calcula `quote_price()` en SQL. La app muestra el desglose y la reserva guarda una **foto** del precio (`price_snapshot`), así un cambio de regla posterior no altera reservas ya hechas.
- Tope de ajuste configurable (ej. ±20 %) para que ninguna regla genere precios absurdos.

## 1.5 NFC y Smart Universal Link

Un tag NFC solo guarda una **URL https** (NDEF), por ejemplo `https://<dominio>/t/<tag_id>`. Ni el tag ni la URL contienen datos personales ni saldo.

```
Teléfono lee el tag
   │
   ├─ App instalada ──► Universal Link (iOS) / App Link (Android) abre la app en /t/<tag_id>
   │                     1. Edge Function `nfc-resolve` valida el tag y la sesión
   │                     2. Check-in de la reserva de hoy o abre el perfil
   │                     3. Si instagram_url ≠ null → abre Instagram de Car Wash 505
   │
   └─ Sin app ─────────► El navegador abre la web /t/<tag_id> (ruta nueva en Next.js)
                         → detecta iOS/Android por User-Agent → redirige a App Store / Play Store
                         (escritorio → página con los dos botones)
```

Requisitos:
- Dominio de producción (pendiente en la web).
- `apple-app-site-association` y `assetlinks.json` servidos por la web.
- En iPhone, leer tags NDEF con una URL funciona sin abrir la app (iPhone XS o posterior).
- Del lado del **operador**, validar la tarjeta VIP física con la app abierta usa `react-native-nfc-manager` (requiere *development build*, no funciona en Expo Go).

**QR:** misma URL `https://<dominio>/t/<id>` o un token firmado de corta duración mostrado en la wallet del cliente (rota cada 60 s para evitar capturas de pantalla reutilizadas). El operador lo escanea con `expo-camera`.

## 1.6 Fidelización (wallet)

- **Puntos:** libro contable de solo inserción (`loyalty_ledger`). El saldo es la suma y nunca se edita una cifra. Puntos por: reserva completada, reseña **interna** enviada, referido, reto mensual.
- **Badges:** reglas declarativas evaluadas por un trigger al completar una reserva.
- **Spin-to-Win:** el premio lo sortea el **servidor** (`spin_wheel(booking_id)`, una vez por reserva completada). La animación del teléfono solo muestra el resultado ya decidido.
- **Gift cards:** el código se guarda con hash; su movimiento de saldo sigue el mismo patrón de libro contable. Transferir = cambiar de dueño con confirmación del receptor.
- **Membresías Free/Gold/Platinum:** los beneficios son filas en BD, no código. Los precios y beneficios están **pendientes** del negocio.

## 1.7 Marketing automático

Una Edge Function `campaign-runner` se ejecuta con `pg_cron` y evalúa disparadores:

| Disparador | Fuente | Ejemplo |
|---|---|---|
| Clima | Open-Meteo (gratis, sin API key) para Managua, cada 3 h | Lluvia > 70 % en 24 h → "Reserva hoy" / cierre sugerido al propietario |
| Inactividad | Última reserva completada hace 14 / 30 días | Cupón 20 % (el % lo define el propietario) |
| Cumpleaños | `customers.birthday` | Beneficio de cumpleaños |
| Ocupación | `available_slots` del horario habitual del cliente | "Quedan 3 espacios" (solo con cifras **reales** del sistema) |

Salvaguardas:
- Consentimiento de marketing separado del de servicio.
- Máximo N pushes por cliente por semana.
- Horario de silencio.
- Registro en `notification_log`.
- Nada de mensajes de prueba social inventados: "5 personas han reservado hoy" solo se envía si el conteo real es ≥ 5.

## 1.8 Analítica y seguridad operativa

- **Predicción de no-show:** primero un **puntaje por reglas**, explicable al propietario (historial de no-shows, respuesta al recordatorio, antelación de la reserva, clima, primera visita). El modelo estadístico queda para cuando haya meses de datos reales.
- **Blacklist:** `customer_restrictions` con motivo, fecha de fin y quién lo decidió. Nunca es automática ni permanente sin revisión humana. La app muestra al cliente un mensaje neutro ("contacta al negocio por WhatsApp"). Así se cumple la Ley 787 (derecho a saber y rectificar).
- **Reportes PDF/Excel:** se generan en una Edge Function y se descargan con un enlace firmado de corta duración.
- **Auditoría:** toda acción del personal y del propietario queda en `audit_logs` (ya existe en la web).

## 1.9 Evidencia fotográfica

- Bucket **privado** `service-evidence` (distinto del bucket `public-media` de la web). Se accede por URL firmada.
- Estructura: `bookings/<booking_id>/<before|after|damage>/<uuid>.jpg`.
- Se comprime en el teléfono (`expo-image-manipulator`, ~1600 px, JPEG 80) y se borran los metadatos EXIF de ubicación.
- El reporte de **daños preexistentes** se hace en el check-in, con fotos del operador y aceptación del cliente en la app. Protege a ambas partes.

## 1.10 Offline y resiliencia

- El tablero del operador cachea el día (TanStack Query con persistencia). Si se pierde la red, las fotos quedan en cola y se suben al volver.
- Las acciones de estado sin red se **bloquean** con un aviso claro. No se hacen escrituras optimistas silenciosas sobre reservas.
- Si Supabase no responde, el cliente ve el botón de WhatsApp (misma filosofía de la web: nunca perder una solicitud en silencio).
