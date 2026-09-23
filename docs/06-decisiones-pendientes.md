# 6 · Decisiones pendientes

> La lista viva y actualizada de pendientes está en **[PENDIENTES.md](PENDIENTES.md)**. Este documento conserva el análisis original de cada decisión.

Siguiendo la regla de la web (**no inventar contenido del negocio**), estas respuestas deben venir del negocio antes de construir la fase indicada. Hasta entonces, el dato queda en `null` y la función se oculta.

## Bloquean fases

| # | Decisión | Fase | Opciones / nota |
|---|---|---|---|
| 1 | **Cuántas bahías** hay y de qué tipo (lavado / detallado) | F1 | Sin esto no hay control de capacidad |
| 2 | **Duración interna** de cada servicio (auto/SUV) para agendar | F1 | Solo uso interno. No se publica mientras no esté confirmada |
| 3 | ¿Qué servicios se pueden **reservar** y cuáles siguen "requiere evaluación"? | F1 | `services.bookable` |
| 4 | Si el cliente **no responde** en la ventana de 30 min: ¿se mantiene, se cancela o se libera tras X min? | F2 | **Aplicado provisionalmente (F2):** se mantiene y el personal la ve como "Sin respuesta"; pasa a no-show solo a T+15. Tiempos ajustables en el panel |
| 5 | ¿"Llegaré tarde" mueve la reserva o solo avisa? ¿Hasta cuántos minutos? | F2 | **Aplicado provisionalmente (F2):** solo avisa; la tolerancia sigue siendo 15 min (ajustable) |
| 6 | Método de **inicio de sesión**: SMS, WhatsApp o correo | F0 | **Provisional: código por correo** (gratis y probable en local). SMS tiene costo por mensaje (Twilio o similar); con WhatsApp hace falta la API de WhatsApp Business. Cambiarlo solo afecta `src/app/(auth)` y la configuración de Auth |
| 7 | **Pasarela de pagos** que opere con comercios en Nicaragua | F4 | Stripe no ofrece cuentas a comercios de Nicaragua (verificar). Candidatas a evaluar: procesadores bancarios locales (p. ej. BAC Credomatic), PayPal, Pagadito u otras regionales. Se debe confirmar el soporte de **cobro recurrente** |
| 8 | Precios y beneficios de **Free / Gold / Platinum** | F4 | `membership_plans.price` queda en `null` hasta confirmar |
| 9 | Reglas de la **Tarjeta VIP** (hoy pendientes en la web) | F3 | Cantidad, servicios, beneficio, vigencia. **La app ya las usa:** al definir la cantidad en el panel, el VIP es automático |
| 10 | Tabla de **puntos** (cuántos por qué) y catálogo de canje | F3 | **El motor está listo y apagado:** panel → *Puntos (app)* y *Premios (app)*. Umbral provisional de "Asistencia Perfecta": 5 servicios sin faltar |
| 11 | **Premios** de la ruleta y probabilidades | F4 | Revisar con asesor legal si aplica normativa de promociones o sorteos |
| 12 | Reglas de **tarifa dinámica** (horas pico/valle, % por clima, tope) | F5 | |
| 13 | **Dominio** de producción | F7 | También lo necesita la web |
| 14 | URL oficial de **Instagram**, **Waze** y **Google Maps** | F2 / F7 | Hoy son `null` en `src/config/site.ts` |

## Riesgos o conflictos con el requerimiento

| Tema | Conflicto | Propuesta |
|---|---|---|
| Reseñas | La web **prohíbe** mostrar reseñas o estrellas. El requerimiento da puntos por "reseña enviada" | Las reseñas son **internas** (retroalimentación para el negocio) y no se publican. Si el negocio quiere publicarlas, cambiar la regla en la web primero |
| Prueba social ("5 personas han reservado hoy") | Riesgo de cifras inventadas | Solo cifras reales calculadas por el sistema, y solo si superan un mínimo |
| Blacklist / fraude | Datos personales sensibles (Ley 787 de Nicaragua) | Restricción con motivo, fecha de fin y revisión humana. Se informa al cliente de forma neutral |
| Predicción de no-show | Sin historial no hay modelo fiable | Empezar con un puntaje por reglas explicable. Evaluar un modelo tras 3–6 meses de datos |
| Estimador de tiempo | La web prohíbe duraciones no confirmadas | Se muestra solo con tiempos **medidos** por el sistema |
| Ubicación en segundo plano | Rechazo en tiendas y en la batería | Solo "Llego en X min" manual o una lectura en primer plano |
| Registro de clientes | Hoy el registro público está deshabilitado | Habilitarlo solo para `customers`. El personal sigue entrando por invitación |
| Amarillo `signal` | Provisional en la web | Confirmarlo desde el logo oficial antes de usarlo en VIP/puntos |
| Colores de estado nuevos | No existen en la web | Aprobar `success` / `danger` o elegir otros |
| Textos legales | Borrador en la web | Se requieren aprobados antes de publicar en tiendas |
| Repositorio | `C:\Users\pearl` (tu carpeta de usuario) es un repositorio Git que incluye todo el escritorio | Crear un repo propio para la app (`git init` dentro de `Car Wash 505 App`) al empezar la F0 |
