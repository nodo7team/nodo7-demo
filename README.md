# NODO7 Demos

Portal independiente para entregar demos IPTV mediante códigos de un solo uso. El código no empieza a consumir tiempo al crearse: la ventana segura de 10 minutos comienza únicamente cuando el visitante lo introduce por primera vez.

## Alcance

- `/demo`: acceso público con código, nombre y paquete de demo 6 o 7.
- `/login`: ingreso privado del administrador mediante PIN.
- `/demos`: creación, consulta y revocación de códigos, además del estado de cada solicitud.

Al emitir cada código, el administrador elige qué recibirá el visitante: un **usuario y contraseña** (`create_line`) o un **código de activación** (`create_activecode`). El paquete lo sigue eligiendo el visitante. Un código de activación no trae vencimiento del proveedor, porque la línea nace recién cuando se canjea en la aplicación.
- `/api/cron/demo-cleanup`: vencimiento de sesiones y redacción de datos de auditoría.

El proyecto no incluye clientes, ventas, renovaciones ni gestión general de líneas. Está pensado para desplegarse en Vercel, con Supabase en la cuenta de NODO7 y las credenciales del proveedor también en cuentas controladas por NODO7.

## Desarrollo local

Requisitos: Node.js 20 o superior y un proyecto de Supabase.

```powershell
npm.cmd install
Copy-Item .env.example .env.local
```

Genera tres secretos hexadecimales independientes para `SESSION_SECRET`, `DEMO_HASH_SECRET` y `CRON_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Genera la clave de cifrado de credenciales:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Genera el hash del PIN administrador:

```powershell
npm.cmd run set-pin -- 123456
```

Completa los valores en `.env.local` y ejecuta:

```powershell
npm.cmd run dev
```

## Supabase sin Docker

1. Crea un proyecto nuevo en la cuenta de NODO7.
2. En el SQL Editor, ejecuta las migraciones en orden: `0001_nodo7_demo_access.sql`, `0002_demo_credential_type.sql`, `0003_demo_whatsapp_delivery.sql`, `0004_demo_customers.sql` y `0005_demo_followup.sql`.
3. Copia la URL del proyecto a `NEXT_PUBLIC_SUPABASE_URL`.
4. Copia la clave `service_role` a `SUPABASE_SERVICE_ROLE_KEY` únicamente en `.env.local` y en las variables privadas de Vercel.

También puede aplicarse la migración con la CLI, después de autenticarla y vincular el proyecto:

```powershell
npx.cmd supabase link --project-ref TU_PROJECT_REF
npx.cmd supabase db push
```

No publiques la clave `service_role`, no la envíes por chat y no la subas a Git.

## Seguimiento posterior a la demo

Cuando la demo se apaga, un cron cada quince minutos (`/api/cron/demo-followup`)
pregunta por WhatsApp cómo le fue. Solo pregunta: no menciona precios.

Escribe a quien cumpla **todo**: la demo se creó bien, el WhatsApp de entrega
llegó, el cliente aceptó que lo contacten y nunca se le escribió antes.

Cuándo terminó la demo depende del tipo. Una línea trae su vencimiento del
panel; un código de activación no trae ninguno, porque el reloj arranca cuando
el cliente lo canjea y el panel nunca lo informa. Para esos se estima: entrega
más una hora de gracia más la duración del paquete.

Tres cosas protegen el número, que es lo más frágil de todo esto:

- **Como máximo 15 mensajes por corrida**, espaciados. waclient maneja WhatsApp
  Web, no la API oficial, y una ráfaga es la forma más rápida de que bloqueen la
  línea. A cuatro corridas por hora igual salen sesenta.
- **Horario de silencio** (`FOLLOWUP_QUIET_FROM_UTC` / `_TO_UTC`, por defecto 2
  a 12 UTC). Un mensaje de madrugada quema al cliente.
- **Nunca reintenta.** La fila se marca *antes* de enviar: si la corrida muere a
  la mitad, ese seguimiento se pierde. Un mensaje repetido molesta más que uno
  faltante.

Los textos se cambian con `WHATSAPP_FOLLOWUP_FULL` y `WHATSAPP_FOLLOWUP_LITE`,
sin desplegar. Son distintos a propósito: preguntarle por el fútbol a quien tuvo
la demo de 4 horas sería preguntarle por algo que esa demo nunca le mostró.

## Horarios en los mensajes

El mensaje de credenciales dice **cuánto falta**, nunca una hora del reloj. El
servidor corre en UTC y no sabe dónde está el visitante: decirle a un argentino
que su demo vence a las 18:00 cuando su reloj marca las 15:00 le regala tres
horas que no existen.

En pantalla sí se muestra la hora, porque ahí el navegador conoce la zona
horaria real del cliente.

## Números de teléfono

`libphonenumber-js` valida y normaliza, con dos reglas propias encima.

**El país se identifica por su código ISO, nunca por su código de marcado.**
Cada territorio del Caribe comparte el `+1` con Estados Unidos, y 809, 829 o
787 son códigos de **área** que viajan dentro del número nacional. Guardarlos
como si fueran el código del país hacía que se antepusieran a números que ya
traían el suyo: un dominicano terminaba en `18098295551234`, catorce dígitos
que no llegan a nadie.

**El 9 de los móviles argentinos se agrega a mano.** libphonenumber acepta
`+54 346...` como válido, pero WhatsApp enruta esa forma y `+54 9 346...` a
destinatarios distintos. Los tests de `tests/whatsapp/phone.test.ts` fijan ese
comportamiento; si se rompen, las credenciales le llegan a un desconocido.

`lib/whatsapp/countries.ts` y `public/flags/*.webp` son artefactos generados.
Para rehacerlos tras actualizar libphonenumber:

```powershell
npm.cmd i -D flag-icons
node scripts/generate-country-data.mjs
```

No edites la tabla a mano: el código de marcado tiene que salir siempre de
libphonenumber.

## Base de clientes

El formulario pide nombre, correo, WhatsApp y una aceptación explícita antes de
generar la demo. Con eso la migración `0004` arma `demo_customers`, la lista de
contactos que se ve en `/clientes`.

El teléfono es la identidad: se valida contra WhatsApp antes de crear nada, así
que es el único dato que se sabe que llega a una persona real. Quien vuelve a
pedir otra demo con el mismo número es el mismo cliente con dos demos.

Desde `0004` la limpieza programada **ya no borra el teléfono**. Los datos de
contacto se guardan mientras el cliente lo haya aceptado; para dar de baja a
alguien hay que borrar su fila de `demo_customers`. Todo lo demás sigue igual:
las credenciales se borran a los 7 días o al vencer, y la IP de activación y el
registro de intentos a los 90.

Las demos anteriores a esta migración no se copian a la lista: a esos visitantes
se les dijo que su número se borraría y nunca aceptaron que se los contactara.

## Entrega por WhatsApp

El portal pide país y teléfono al visitante. Antes de crear la demo valida que el número exista en WhatsApp: si no existe, no se genera nada. Ese orden es lo que obliga a dar un número real, porque validar después caería en el respaldo y dejaría pasar cualquier número inventado.

Después de generar, las credenciales se envían por WhatsApp. **El envío nunca hace fallar la demo**: si el mensaje no sale, las credenciales quedan visibles en pantalla y el panel registra el fallo.

Se entrega con `WHATSAPP_PROVIDER=disabled`, que conserva el comportamiento anterior. Para encenderlo hace falta una cuenta de waclient con una instancia ya vinculada por QR desde su panel.

Dos cosas que conviene saber antes de confiar en el canal:

- Es automatización de WhatsApp Web, no la API oficial de Meta. El número queda expuesto a bloqueo y la sesión puede caerse.
- Un envío exitoso responde `PENDING`, o sea encolado. **Nunca se puede confirmar una entrega**, así que `WHATSAPP_HIDE_CREDENTIALS` debe quedar en `false` hasta comprobar a mano que los mensajes llegan.

`scripts/probe-whatsapp.ts` consulta el estado de la cuenta sin enviar nada.

## Proveedor de demos

El sistema se entrega con `DEMO_PROVIDER=disabled`. Así se puede validar el flujo completo sin crear líneas reales por accidente.

Cuando NODO7 entregue el contrato de la API del proveedor, se ajustará el adaptador aislado y se configurarán `DEMO_PROVIDER_BASE_URL` y `DEMO_PROVIDER_API_KEY`. El adaptador de compatibilidad existente solo debe habilitarse con `DEMO_PROVIDER=clicktv` si el contrato real confirma ese protocolo y los paquetes 6 y 7.

## Verificación

```powershell
npm.cmd run test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run check
```

## Despliegue en Vercel

El destino previsto es el repositorio `nodo7team/nodo7-demo` y un proyecto Vercel de NODO7. Antes del primer despliegue, carga todas las variables de `.env.example` en Vercel y configura los mismos valores para Production, Preview y Development según corresponda.

El cron de Vercel se declara en `vercel.json`. `CRON_SECRET` protege su ejecución. El proveedor debe permanecer desactivado hasta validar la API real y hacer una prueba controlada.
