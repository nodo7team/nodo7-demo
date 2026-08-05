# NODO7 WhatsApp Delivery Design

**Objetivo:** entregar las credenciales de la demo por WhatsApp, pidiendo el teléfono al visitante, para que cada demo deje un contacto verificado.

**Contexto:** hoy el visitante escribe nombre y paquete, y las credenciales aparecen en pantalla. El teléfono no existe en ninguna parte del sistema.

## Decisiones tomadas

- El **portal** pide el teléfono al visitante, no el administrador.
- Lo que se envía son las **credenciales ya generadas**, no el código de acceso.
- El número se valida **antes** de crear la demo.
- Si el envío falla, las credenciales se muestran en pantalla como respaldo.
- Se usa la **Web API** de waclient, no la Cloud API oficial, por decisión del cliente.

## Por qué el orden importa

Validar después de generar rompe el propósito de la función: un número inventado caería en el respaldo y mostraría las credenciales igual. La validación previa es la única puerta real.

```
nombre + paquete + teléfono
   │
   ├─ 1. formato válido (navegador y servidor)
   ├─ 2. check_number ──── no existe → error, no se crea nada
   ├─ 3. create_line / create_activecode
   ├─ 4. persistir credenciales cifradas    ← el código se consume acá
   └─ 5. enviar por WhatsApp
          ├─ ok    → confirmación con el número enmascarado
          └─ falla → credenciales en pantalla con aviso
```

Crear demos de trial no consume créditos del proveedor, así que el orden no responde a un costo: responde a que sin él la función no fuerza nada.

## Riesgo asumido

La Web API es automatización de WhatsApp Web, no la API oficial de Meta. El número comercial de NODO7 queda expuesto a bloqueo, y la sesión puede caerse exigiendo volver a escanear el QR. El cliente eligió este camino conociendo la alternativa oficial.

Mitigación: el panel muestra el estado de la instancia, y el envío nunca hace fallar la generación.

## Módulo

`lib/whatsapp/` replica la estructura de `lib/demo/provider.ts`:

```ts
export interface WhatsAppClient {
  numberExists(phone: string): Promise<boolean>;
  sendText(input: { phone: string; message: string }): Promise<void>;
  instanceState(): Promise<WhatsAppConnectionState>;
}
```

Un adaptador `providers/waclient.ts` y un cliente desactivado cuando faltan las variables, igual que `DEMO_PROVIDER=disabled`.

Endpoints usados:

| Operación | Endpoint |
|---|---|
| Validar número | `POST https://api.waclient.com/check_number` |
| Enviar texto | `POST https://api.waclient.com/send` |
| Estado de la sesión | `GET https://api.waclient.com/instance_status` |
| Número conectado | `GET https://api.waclient.com/instance_info` |

La vinculación por QR se hace en el panel de waclient, no en NODO7. Construir una pantalla de QR propia queda fuera de alcance.

## Identidad del remitente

Un `access_token` puede tener varias instancias, y **cada instancia está atada a un número distinto**. El `instance_id` es lo único que decide desde qué número sale el mensaje: `/send` no tiene un campo de remitente.

```
POST /send
{ "number": "...",       ← destinatario
  "instance_id": "..." } ← elige el remitente
```

El número queda atado a la instancia al vincular, y lo define el teléfono que confirma la vinculación. `get_paircode` recibe un `phone`, pero ese campo indica **qué cuenta vincular**, no a quién enviar; se presta a confusión con el `number` de `/send`.

NODO7 envía desde un único número, así que el `instance_id` va fijo en una variable de entorno.

**Guarda contra el remitente equivocado.** Si la sesión se cae y alguien vuelve a vincular esa instancia con otro teléfono, el `instance_id` no cambia y los mensajes saldrían desde un número ajeno sin que nadie se entere. Antes de enviar se contrasta el número realmente conectado contra el esperado:

```
GET /instance_info → data.account.phone
```

Si no coincide con `WHATSAPP_EXPECTED_PHONE`, no se envía y el panel avisa. Con varias instancias bajo el mismo token, apuntar al `instance_id` equivocado es un error fácil de cometer y difícil de notar.

## Huecos en la documentación del proveedor

Revisadas las 156 páginas de documentación (140 endpoints de Web API en 16 grupos), faltan tres cosas que condicionan el diseño:

1. **Ninguna respuesta de error está documentada.** Los ejemplos muestran solo el caso exitoso. No se sabe qué devuelve `/send` con la instancia caída, ni el formato del error, ni el código HTTP. La sección de Cloud API sí documenta sus errores; la Web API no.
   Además, donde sí hay ejemplo puede estar equivocado: la respuesta real de `check_number` no se parece a la publicada (ver más abajo). Los ejemplos de la documentación se tratan como orientativos, no como contrato.
2. **`set_webhook` no documenta los eventos** que entrega ni su estructura.
3. **No hay límites de tasa, cuotas ni política de reintentos** en ninguna página.

Los contratos reales de `check_number` y `/send` quedaron verificados contra la API y están documentados más abajo. El resto de los endpoints sigue sin verificar, y sus ejemplos no merecen confianza.

Consecuencias:

- El adaptador trata como fallo **todo lo que no sea** `status: "success"`, y parsea a la defensiva.
- El código HTTP se ignora por completo: la API responde 200 también en los errores.
- `delivery_status = 'sent'` significa **"la API aceptó el mensaje"**, no "el cliente lo recibió". Sin webhooks documentados no hay forma de confirmar la entrega.
- Los límites de envío hay que preguntárselos a waclient antes de depender del canal.

## Contrato real de `check_number`

Verificado contra la API el 2026-08-04. **No coincide con la documentación**, que promete `data.results[]` con un campo `exists`.

```json
{ "status": "success",
  "message": "WhatsApp number is valid",
  "data": { "number": "...", "valid": true } }
```

| Caso | HTTP | `status` | `data.valid` |
|---|---|---|---|
| Número registrado | 200 | `success` | `true` |
| Número no registrado | 200 | `success` | `false` |
| Número malformado | 200 | `success` | `false` |
| Falta el número | 400 | `error` | — |

Acepta `numbers: []`, `number:` y una cadena separada por comas indistintamente, y siempre devuelve un objeto único.

**Se lee `data.valid` y nunca `message`.** Con `123` como entrada, la API responde `"WhatsApp number is valid"` mientras `data.valid` es `false`: el texto contradice al dato.

### La trampa de la instancia muerta

Con un `instance_id` inexistente, la respuesta es `HTTP 200`, `status: "success"`, `valid: false`. **No hay error.**

Si el `instance_id` está mal configurado o la sesión se cayó, `check_number` declara inválido a todo número que reciba. Cada visitante vería "tu número no está en WhatsApp", nadie podría generar una demo, y no quedaría registrado ni un error: un fallo total y silencioso que además culpa al usuario.

Por eso **un `valid: false` solo se cree si la instancia está sana**. Antes de rechazar a nadie se confirma `connection_state === "connected"` con `instance_status`. Si la instancia no está conectada, no se valida y se deja pasar, igual que cuando `check_number` no responde: el visitante nunca paga por una falla nuestra.

## Contrato real de `/send`

Verificado contra la API el 2026-08-04, con un envío exitoso confirmado en el teléfono de destino.

Éxito:

```json
{ "status": "success", "message": "Success",
  "message_payload": {
    "key": { "remoteJid": "…@s.whatsapp.net", "fromMe": true, "id": "3EB0…" },
    "messageTimestamp": "1785888536",
    "status": "PENDING" } }
```

Errores observados:

| Situación | HTTP | `status` | `message` |
|---|---|---|---|
| Envío aceptado | 200 | `success` | `Success` |
| Instancia inexistente o caída | **200** | `error` | `Instance ID Invalidated` |
| Número inválido | **200** | `error` | `Invalid phone number` |
| Token inválido | **200** | `error` | `Access token does not exist` |

### Todo devuelve HTTP 200

Incluso los errores. **El código HTTP no sirve para decidir nada**: el éxito es exclusivamente `payload.status === "success"`.

Un `if (response.ok)` daría por exitoso cualquier fallo, el respaldo en pantalla no se mostraría nunca, y el visitante quedaría esperando un mensaje que jamás se envió. Es el error natural que cometería cualquier implementación razonable contra esta API.

### `PENDING` significa encolado, no entregado

El campo `status` del envío exitoso es `PENDING`. La API confirma que aceptó el mensaje, no que llegó. Sumado a que los eventos de webhook no están documentados, **no hay forma programática de confirmar una entrega**.

Por eso `delivery_status = 'sent'` se llama así y no `'delivered'`.

### Latencia

El envío tardó 4,7 segundos. Se suma al tiempo de creación de la demo en ClickTV, así que la espera del visitante pasa de unos 3 a unos 8 segundos.

Se espera igual la respuesta en vez de enviar en segundo plano: sin conocer el resultado no se puede decidir si mostrar el respaldo, y el respaldo es lo que evita que alguien quede sin su demo. La espera es el precio de esa garantía.

## Base de datos

```sql
alter table demo_requests
  add column phone text,
  add column delivery_status text not null default 'pending'
    check (delivery_status in ('pending','sent','failed','disabled'));
```

El teléfono es dato personal y entra en la regla de redacción existente de los 90 días, junto con `activation_ip`.

## El teléfono del visitante

NODO7 opera desde Estados Unidos, pero **las demos se piden desde cualquier parte del mundo**. No hay un código de país que se pueda asumir: si alguien escribe `5551234`, no existe forma de saber si es estadounidense, mexicano o español.

Adivinar mal sale caro. `check_number` respondería que el número no existe y le negaríamos la demo a un cliente real, con un rechazo idéntico al de un número inventado.

Por eso el formulario separa el país del número local:

```
┌─────────────────┬──────────────────────┐
│ 🇺🇸 +1        ▾ │ (346) 555-1234       │
└─────────────────┴──────────────────────┘
  Te enviaremos las credenciales por WhatsApp
  a este número: +1 346 555 1234
```

El selector lista todos los países con su prefijo y arranca en Estados Unidos, que es el mercado principal. El número canónico es el prefijo seguido del número local, descartando todo carácter que no sea dígito.

Debajo se muestra el número resultante para que la persona lo confirme antes de generar. La validación de formato solo descarta llamadas obviamente inútiles: **la verificación real es `check_number`**.

La tabla de prefijos vive en `lib/whatsapp/country-codes.ts` como dato estático, sin dependencias externas.

## Mensaje

El texto vive en `WHATSAPP_MESSAGE_TEMPLATE` con marcadores, para que NODO7 lo cambie sin redesplegar. Valor por omisión:

```
Tu demo NODO7 está lista.

{credenciales}

{vencimiento}
```

Donde `{credenciales}` se arma según el tipo: usuario y contraseña en dos líneas, o el código de activación en una.

## La transición a WhatsApp como único canal

Un interruptor en vez de dos entregas:

```
WHATSAPP_HIDE_CREDENTIALS=false   → se envía y se muestra
WHATSAPP_HIDE_CREDENTIALS=true    → se muestra solo si el envío falló
```

Arranca en `false`, y conviene que se quede ahí un tiempo largo.

El motivo está verificado: el envío exitoso devuelve `status: "PENDING"`, o sea encolado. `sent` solo dice que la API aceptó el mensaje, y sin webhooks documentados no hay manera de saber si llegó. Pasar a `true` significa cortar la pantalla confiando en una señal que nunca confirma entrega.

La prueba del 2026-08-04 sí llegó al teléfono, lo que demuestra que el canal funciona. Una entrega comprobada no es lo mismo que entrega garantizada.

Antes de activarlo, NODO7 debería comprobar a mano, sobre demos reales, que los mensajes efectivamente llegan. El cambio se hace en Vercel, sin redesplegar, y se revierte igual de rápido si aparecen quejas.

## Variables de entorno

```
WHATSAPP_PROVIDER=disabled
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_INSTANCE_ID=
WHATSAPP_EXPECTED_PHONE=
WHATSAPP_MESSAGE_TEMPLATE=
WHATSAPP_HIDE_CREDENTIALS=false
```

`WHATSAPP_EXPECTED_PHONE` es el número de NODO7 desde el que deben salir los mensajes, en formato internacional. Sirve de guarda, no de selector: quien elige el remitente es `WHATSAPP_INSTANCE_ID`.

## Límite de intentos

Hoy son 3 y cualquier envío mal formado consume uno, a propósito, para impedir sondeos. Con un campo más donde equivocarse, dos typos en el teléfono dejan al visitante a un error de perder la demo. Sube a 5, con la misma restricción en la base.

## Manejo de errores

| Situación | Resultado |
|---|---|
| Formato de teléfono inválido | Error en el formulario, no se llama a nadie |
| `check_number` dice que no existe **y la instancia está conectada** | Error visible, no se crea la demo |
| `check_number` dice que no existe **con la instancia caída** | Se ignora el veredicto y se genera igual: con la sesión muerta la API rechaza todo |
| `check_number` no responde | Se continúa y se genera igual; no se puede castigar al visitante por una caída nuestra |
| El número conectado no es el esperado | No se envía. `delivery_status = 'failed'` y aviso en el panel |
| Envío falla o la instancia está desconectada | `delivery_status = 'failed'`, credenciales en pantalla |
| `WHATSAPP_PROVIDER=disabled` | `delivery_status = 'disabled'`, comportamiento actual intacto |

## Panel

`CodeTable` suma el teléfono enmascarado y el estado de entrega. La cabecera del panel muestra el estado de la instancia de WhatsApp, para que el administrador vea cuándo hay que volver a escanear el QR.

## Alcance excluido

Recepción de mensajes, webhooks, plantillas de Meta y la Cloud API oficial.
