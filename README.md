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
2. En el SQL Editor, ejecuta las migraciones en orden: `0001_nodo7_demo_access.sql`, `0002_demo_credential_type.sql` y `0003_demo_whatsapp_delivery.sql`.
3. Copia la URL del proyecto a `NEXT_PUBLIC_SUPABASE_URL`.
4. Copia la clave `service_role` a `SUPABASE_SERVICE_ROLE_KEY` únicamente en `.env.local` y en las variables privadas de Vercel.

También puede aplicarse la migración con la CLI, después de autenticarla y vincular el proyecto:

```powershell
npx.cmd supabase link --project-ref TU_PROJECT_REF
npx.cmd supabase db push
```

No publiques la clave `service_role`, no la envíes por chat y no la subas a Git.

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
