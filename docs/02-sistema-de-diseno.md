# 2 · Sistema de diseño UI/UX

## 2.1 Principios

1. **Minimalista:** una acción principal por pantalla, mucho espacio negativo y máximo 2 niveles de jerarquía tipográfica a la vista.
2. **Paridad con la web:** los mismos colores, fuentes, radios y tono. La fuente única es `src/design/tokens.ts`, copiada de `../Car Wash 505/src/styles/tokens.css`.
3. **Oscuro por defecto** (como la web), con **superficies claras estratégicas** (`light`) para formularios largos, recibos y la wallet, donde la lectura importa más.
4. **Pulgar primero:** las acciones principales van en la mitad inferior de la pantalla, con un área táctil mínima de 44 pt (igual que `.btn` de la web).
5. **Honestidad:** lo no confirmado no se muestra. Nada de estados vacíos con datos falsos: se usa un estado vacío con acción real.

## 2.2 Tokens (resumen)

| Token | Valor | Uso |
|---|---|---|
| `ink` | `#05070a` | Fondo base |
| `surface` | `#101820` | Tarjetas, hojas |
| `ice` | `#f4f7fa` | Texto principal / fondo claro |
| `steel` | `#aab4bf` | Texto secundario |
| `brand` | `#0b5ea8` | Botón primario |
| `cyan` | `#42c8f5` | Acento, foco, enlaces, eyebrow |
| `signal` | `#f2c200` | Amarillo del logo (**provisional**): VIP, puntos, alertas |
| `success` / `danger` | `#3ccf8e` / `#ff5a5f` | **Nuevos**, solo estados (Kanban, errores). A aprobar |

**Tipografía:**
- **Saira Condensed** (500/600/700, MAYÚSCULAS) para títulos, botones, eyebrows y números.
- **Figtree** para el cuerpo del texto.

Se cargan con `@expo-google-fonts/saira-condensed` y `@expo-google-fonts/figtree`.

**Radios:** `control` 12 · `panel` 20 · `edit` 4.

**Vidrio (glass):** se replica con `expo-blur` en hojas y barras, con el blur reducido en móvil (8 px, igual que la web) y un color sólido de respaldo (`glassBgStrong`) en Android de gama baja.

**Iconografía:** la web no usa una librería de íconos. Se propone **Lucide** (`lucide-react-native`): trazo fino y lineal, coherente con el estilo minimalista. Si la web la adopta después, queda idéntica.

**Logo:** solo los archivos oficiales (`carwash505-logo-blanco.png` para fondos oscuros, `carwash505-logo-oficial.jpg` para ícono y splash). Nunca se reconstruye con texto.

## 2.3 Componentes base (`src/design/components`)

| Componente | Equivalente web | Notas |
|---|---|---|
| `Button` (`primary` / `ghost` / `quiet`) | `.btn-*` | Saira MAYÚSCULAS, estado `loading` con spinner, `disabled` al 55 % |
| `Text` (`display`, `eyebrow`, `body`, `number`) | `.display`, `.eyebrow`, `.index-number` | Eyebrow con la línea de 32 px antes, como en la web |
| `Card` / `GlassSheet` | `glass.css` | Borde de 1 px `line`, radio `panel` |
| `Field`, `Select`, `PhoneField` (E.164, +505 por defecto) | `lead-fields.tsx` | Validación con los mismos esquemas Zod |
| `Chip` / `StatusBadge` | `open-status-badge.tsx` | Estados de reserva con color + ícono + texto (nunca solo color) |
| `SlotPicker` | nuevo | Días en carrusel horizontal y franjas en rejilla. Los ocupados se ven tachados, no ocultos |
| `KanbanColumn` / `BookingCard` | nuevo | Arrastrar o botón "Siguiente estado" (el botón es obligatorio por accesibilidad) |
| `WalletCard` | nuevo | Tarjeta VIP, membresía y gift card, con QR rotativo |
| `PhotoCapture` | nuevo | Guía de encuadre (frente, laterales, interior) antes/después |
| `EmptyState`, `ErrorState`, `OfflineBanner` | nuevo | Siempre con una acción (reintentar / WhatsApp) |

## 2.4 Navegación por rol

**Cliente:** barra inferior con 4 pestañas.
1. **Inicio:** próxima cita (con estado en vivo y estimador), botón "Reservar" y "Repetir último lavado".
2. **Reservar:** servicio → vehículo → fecha y hora → extras (upselling) → resumen con desglose de precio → confirmar.
3. **Wallet:** puntos, nivel, badges, membresía, gift cards y QR/VIP.
4. **Perfil:** garage, historial y galería antes/después, soporte (tickets), tips, preferencias y privacidad.

**Colaborador:** una sola pantalla **Hoy**.
- Pestañas por estado (*Entrantes · En curso · Completadas · Canceladas/No-show*). En un teléfono, 4 columnas Kanban no caben: en tablet se muestran como columnas.
- Botón flotante **Escanear** (QR/NFC).
- Cada tarjeta muestra hora, placa, vehículo, servicio, bahía, empleado asignado y la acción siguiente.

**Propietario:** 5 pestañas.
1. **Dashboard:** ocupación %, ingresos del día, clientes VIP presentes y alertas de no-show, todo en tiempo real.
2. **Agenda:** vista por bahías y el cierre por clima.
3. **Clientes:** perfiles, puntaje de no-show y restricciones.
4. **Negocio:** precios y reglas, campañas, inventario, mantenimiento.
5. **Reportes.**

La edición compleja (catálogo, textos, medios) sigue en el panel web.

## 2.5 Flujo clave: reservar en ≤ 4 toques

```
Inicio ─► [Repetir lavado] ─► Resumen (mismo servicio + vehículo, próxima franja libre sugerida) ─► [Confirmar]
Inicio ─► [Reservar] ─► Servicio ─► Franja ─► Resumen ─► [Confirmar]    (vehículo por defecto preseleccionado)
```

Upselling: **una** tarjeta de extras en el resumen, basada en el historial del vehículo. Nunca aparece como un modal que interrumpa.

## 2.6 Movimiento

- `react-native-reanimated` con las duraciones de `tokens.motion` (180 ms para controles, como la web).
- Se respeta "Reducir movimiento" del sistema: la ruleta de Spin-to-Win pasa a revelar el resultado sin girar.

## 2.7 Accesibilidad (WCAG 2.2 AA, igual que la web)

- Contraste verificado: `ice` sobre `ink` ≈ 19:1, `steel` sobre `ink` ≈ 9:1, blanco sobre `brand` ≈ 6.5:1.
- `cyan` sobre `ice` **no** llega a 4.5:1 como texto. Por eso en superficies claras el acento es `brand` (igual que `.surface-light`).
- Soporte de *Dynamic Type* hasta 200 %, sin textos cortados. Los títulos `display` hacen wrap.
- Todo control tiene `accessibilityLabel` y `accessibilityRole`, y los estados se anuncian ("Reserva movida a En curso").
- Idioma: ES por defecto y EN opcional. Se reutilizan los diccionarios `src/i18n/es.ts` y `en.ts` de la web donde los textos coincidan.

## 2.8 Tono de voz

El mismo de la web: directo, profesional y sin superlativos inventados.

- En las notificaciones: primero el dato y luego la acción. Ejemplo: "Lluvia probable mañana. Reserva hoy tu lavado".
- Sin emojis en textos transaccionales. En tips y comunidad se permiten con moderación.
