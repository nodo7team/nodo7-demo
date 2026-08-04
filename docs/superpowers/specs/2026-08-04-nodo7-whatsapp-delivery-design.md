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

La vinculación por QR se hace en el panel de waclient, no en NODO7. Construir una pantalla de QR propia queda fuera de alcance.

## Base de datos

```sql
alter table demo_requests
  add column phone text,
  add column delivery_status text not null default 'pending'
    check (delivery_status in ('pending','sent','failed','disabled'));
```

El teléfono es dato personal y entra en la regla de redacción existente de los 90 días, junto con `activation_ip`.

## Normalización de números

Los celulares argentinos en WhatsApp llevan un `9` después del código de país: `5491155551234`, no `541155551234`. Sin ese dígito el mensaje no llega o va a otro destinatario.

El normalizador acepta lo que el visitante escriba (`11 5555-1234`, `+54 9 11 5555 1234`, `01155551234`) y produce la forma canónica. El formulario muestra el número resultante para que la persona lo confirme antes de enviar.

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

Arranca en `false`. La Web API puede responder `success` sin que el mensaje llegue, así que conviene confirmar entregas reales durante unos días antes de cortar la pantalla. El cambio se hace en Vercel, sin redesplegar.

## Variables de entorno

```
WHATSAPP_PROVIDER=disabled
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_INSTANCE_ID=
WHATSAPP_MESSAGE_TEMPLATE=
WHATSAPP_HIDE_CREDENTIALS=false
```

## Límite de intentos

Hoy son 3 y cualquier envío mal formado consume uno, a propósito, para impedir sondeos. Con un campo más donde equivocarse, dos typos en el teléfono dejan al visitante a un error de perder la demo. Sube a 5, con la misma restricción en la base.

## Manejo de errores

| Situación | Resultado |
|---|---|
| Formato de teléfono inválido | Error en el formulario, no se llama a nadie |
| `check_number` dice que no existe | Error visible, no se crea la demo |
| `check_number` no responde | Se continúa y se genera igual; no se puede castigar al visitante por una caída nuestra |
| Envío falla o la instancia está desconectada | `delivery_status = 'failed'`, credenciales en pantalla |
| `WHATSAPP_PROVIDER=disabled` | `delivery_status = 'disabled'`, comportamiento actual intacto |

## Panel

`CodeTable` suma el teléfono enmascarado y el estado de entrega. La cabecera del panel muestra el estado de la instancia de WhatsApp, para que el administrador vea cuándo hay que volver a escanear el QR.

## Alcance excluido

Recepción de mensajes, webhooks, plantillas de Meta y la Cloud API oficial.
