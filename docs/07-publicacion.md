# 07 · Publicación en App Store y Google Play

Guía de lo que hace falta para publicar. **Nada de esto se ha ejecutado**: publicar requiere tu autorización y las cuentas del negocio. Lo que falta decidir o conseguir está también en [PENDIENTES](PENDIENTES.md).

## 1. Bloqueos antes de enviar a revisión

| Bloqueo | Por qué | Dónde |
|---|---|---|
| **Backend en producción** (proyecto Supabase, migraciones 7–14, Edge Functions) | La app no funciona sin él | PENDIENTES §3 |
| **Eliminar la cuenta desde la app** | Apple (guía 5.1.1(v)) y Google Play lo exigen a las apps que permiten crear cuenta. Hoy no existe: necesita el backend | PENDIENTES #20 |
| **Textos legales aprobados** (privacidad y términos, Ley 787) | Ambas tiendas piden una URL pública de política de privacidad | PENDIENTES #16 |
| **Dominio de producción** | URL de privacidad, enlaces `/t/<id>` y NFC | PENDIENTES #14 |
| **Cuentas**: Apple Developer (USD 99/año), Google Play (USD 25, pago único), Expo (EAS) | Firmar, compilar y publicar | §2 |
| **Identificador definitivo** de la app (hoy `com.carwash505.app`, provisional) | No se puede cambiar después de publicar | PENDIENTES #19 |

## 2. Cuentas y configuración

1. **Expo / EAS:**
   - `npx eas-cli login`.
   - `npx eas-cli init`, que agrega `extra.eas.projectId` a `app.json`. También lo necesitan las notificaciones push (`usePushNotifications` no registra el dispositivo sin él).
2. **Apple Developer:** crear el App ID con el bundle definitivo. Las capacidades a activar son *Push Notifications* (y *Associated Domains* cuando haya dominio).
3. **Google Play Console:** crear la app con el mismo paquete. Guardar la huella SHA-256 del certificado de firma de la app (*Integridad de la app*) para `assetlinks.json`.

## 3. Compilar y probar (`eas.json` ya está listo)

| Perfil | Para qué | Comando |
|---|---|---|
| `development` | Probar en tu teléfono con el cliente de desarrollo (`expo-dev-client` ya está instalado). Push y cámara reales | `npx eas-cli build --profile development --platform android` |
| `preview` | APK para compartir con el equipo (prueba interna) | `npx eas-cli build --profile preview --platform android` |
| `production` | Build de tienda (versión autoincrementada en EAS) | `npx eas-cli build --profile production --platform all` |

Envío a las tiendas:

- `npx eas-cli submit --platform ios` sube el build a **TestFlight**.
- `npx eas-cli submit --platform android` lo sube a **Prueba interna** de Play.
- Pasar a producción desde App Store Connect / Play Console es un paso manual y requiere tu autorización.

## 4. Enlaces universales y NFC (cuando haya dominio)

**Web.** Definir en el hosting:

- `APPLE_TEAM_ID` e `IOS_BUNDLE_ID`.
- `ANDROID_PACKAGE` y `ANDROID_SHA256_CERT_FINGERPRINTS`.

Con eso responden:

- `https://<dominio>/.well-known/apple-app-site-association`
- `https://<dominio>/.well-known/assetlinks.json`

Sin esas variables responden 404 (ya implementado, F7).

**App.** Agregar a `app.json`:

```json
"ios": { "associatedDomains": ["applinks:<dominio>"] },
"android": {
  "intentFilters": [{
    "action": "VIEW",
    "autoVerify": true,
    "data": [{ "scheme": "https", "host": "<dominio>", "pathPrefix": "/t/" }],
    "category": ["BROWSABLE", "DEFAULT"]
  }]
}
```

**Tiendas.** Cuando las fichas estén publicadas, poner sus URLs oficiales en `BUSINESS.links.appStore` / `playStore` de la web (`src/config/site.ts`). Así `/t/<id>` manda a la tienda correcta a quien no tiene la app.

**Lectura NFC.** Resolver los tags (check-in, perfil, Instagram, tarjeta VIP) necesita la migración en borrador `supabase/drafts/20260924000015_nfc_tips.sql` (espera el backend). La lectura NFC del colaborador (`react-native-nfc-manager`, solo en *development build*) se agrega junto con ella.

## 5. Inventario de datos (para *Privacidad de la app* y *Seguridad de los datos*)

Tomado del código actual. Revisarlo antes de llenar los formularios; si la app cambia, este inventario también cambia.

| Dato | De dónde sale | Uso | ¿Vinculado a la persona? |
|---|---|---|---|
| Correo electrónico | Inicio de sesión con código (OTP) | Cuenta | Sí |
| Vehículos: tipo, marca, modelo, año, color, placa, apodo | Garage (lo escribe el cliente) | Reservas | Sí |
| Reservas e historial, respuesta al recordatorio, "llego en X min" | Uso de la app | Funcionalidad | Sí |
| Fotos del vehículo | Las toma el personal (antes/después); el cliente las adjunta en un reporte (cámara o galería) | Evidencia del servicio y soporte | Sí |
| Reportes de soporte (texto) | Los escribe el cliente | Soporte | Sí |
| Calificación del servicio (1–5 y comentario) | La deja el cliente | Interna, **no se publica** | Sí |
| Cumpleaños (opcional) y consentimiento de marketing | Perfil | Beneficio de cumpleaños y avisos | Sí |
| Puntos, canjes, gift cards, membresías, órdenes de pago | Uso de la app | Fidelización. **No se procesan pagos en la app** (pago en el local) | Sí |
| Token de notificaciones push | Al aceptar notificaciones | Recordatorios y avisos | Sí |

**Lo que la app NO hace** (revisado en las dependencias y el código):

- No usa ubicación, contactos, micrófono ni analítica o publicidad de terceros.
- No rastrea entre apps: no necesita el aviso ATT de Apple.
- No pide nombre ni teléfono. Las columnas `full_name` y `whatsapp` existen en la base, pero ninguna pantalla las llena hoy.

**Seguridad:**

- Todo viaja por HTTPS (Supabase).
- La sesión se guarda en el almacenamiento seguro del teléfono (Keychain/Keystore vía `expo-secure-store`).
- Los datos de otros clientes están protegidos por RLS en la base.

## 6. Permisos (textos ya configurados en `app.json`)

| Permiso | Texto |
|---|---|
| Cámara | "Car Wash 505 usa la cámara para registrar fotos del vehículo antes y después del servicio, y para escanear el QR de la wallet del cliente." |
| Fotos | "Car Wash 505 usa tus fotos solo si eliges adjuntar una imagen a un reporte." |
| Notificaciones | Se piden al entrar. Canales de Android: recordatorios, avisos y "Promociones" (se puede silenciar aparte) |
| Micrófono | Desactivado |
| NFC (futuro) | Se agregará con la lectura NFC del colaborador |

## 7. Ficha de tienda

| Campo | Estado |
|---|---|
| Nombre | "Car Wash 505" (de la marca) |
| Ícono | Generado desde el logo oficial (`assets/brand/generated`) |
| Descripción corta y larga | **Pendiente**: la redacta o aprueba el negocio (no se inventan beneficios, cifras ni garantías) |
| Capturas | **Pendiente**: tomarlas de un build `preview` con datos reales o de prueba autorizados. Sugeridas: Reservar, Detalle con desglose, Wallet (QR y puntos), Historial, Tablero del colaborador, Dashboard del propietario |
| Categoría | **Por decidir** (propuesta: *Estilo de vida* en App Store, *Automóviles y vehículos* en Play) |
| URL de política de privacidad | La de la web, cuando esté aprobada y publicada en el dominio |
| Correo o sitio de soporte | **Pendiente** (el WhatsApp oficial ya existe en la configuración) |
| Clasificación por edad | Cuestionario de cada tienda. La app no tiene contenido sensible ni compras dentro de la app |

## 8. Revisión de Apple y Google

- La app exige iniciar sesión, así que los revisores necesitan **cuentas de prueba**: una de cliente y una de colaborador. En notas de revisión se explica el código por correo, o se prepara una cuenta demo según lo que permita la tienda.
- Notas sugeridas: "Los pagos se realizan en el local; la app no procesa pagos. Las funciones de personal requieren una invitación del negocio."
