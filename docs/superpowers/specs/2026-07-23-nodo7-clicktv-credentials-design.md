# Diseño: credenciales NODO7 y contrato ClickTV

**Fecha:** 2026-07-23  
**Estado:** aprobado para planificación

## Objetivo

Ajustar la creación de demos de NODO7 al contrato vigente de Xtream-Masters/ClickTV y entregar credenciales legibles para el cliente, sin perder la protección frente a reintentos o resultados ambiguos.

## Paquetes públicos

La consulta en vivo del endpoint `packages` confirmó cuatro paquetes de prueba: `6`, `7`, `32` y `33`. NODO7 ofrecerá solamente:

- `6`: demo de 4 horas sin eventos, deportes locales ni deportes premium.
- `7`: demo FULL de 1 hora con toda la programación.

Los paquetes `32` y `33` quedan fuera del alcance para mantener una elección pública simple. No se modifica la restricción actual de base de datos `package_id in (6, 7)`.

## Formato de usuario

El usuario se construye con el primer nombre introducido por el visitante:

1. Se toma la primera palabra no vacía.
2. Se normaliza a minúsculas y se eliminan tildes, espacios y caracteres que no sean ASCII alfanuméricos.
3. La base se limita a 12 caracteres; si queda vacía se usa `cliente`.
4. Se agrega `tv` y un sufijo de tres dígitos.

Ejemplos:

- `Pedro Gómez` → `pedrotv872`
- `María José` → `mariatv041`

El sufijo se deriva mediante HMAC de la clave de idempotencia de la solicitud. Tiene apariencia aleatoria pero permanece estable para una misma solicitud. Un nuevo código de acceso produce otra clave de idempotencia y, por tanto, otro sufijo.

## Formato de contraseña

La contraseña contiene exactamente 8 caracteres alfanuméricos de un alfabeto sin caracteres visualmente confusos. Se deriva mediante HMAC de la clave de idempotencia, por lo que:

- no se almacena en texto plano antes de llamar al proveedor;
- la misma solicitud conserva la misma contraseña durante cualquier reintento;
- solicitudes distintas obtienen valores distintos.

## Solicitud al proveedor

El adaptador realizará un `POST` con `content-type: application/x-www-form-urlencoded`. Todos los parámetros se enviarán en el cuerpo:

- `api_key`
- `action=create_line`
- `package=6|7`
- `trial=1`
- `is_isplock=0`
- `username`
- `password`

La URL configurada no debe incluir `api_key` ni `action`.

## Respuestas y seguridad contra duplicados

Solo se considerará exitosa una respuesta HTTP válida con JSON, `status === "STATUS_SUCCESS"` y un objeto `data` con la línea creada.

- Un error HTTP `5xx`, una caída de red o JSON inválido se considera resultado ambiguo y no se reintenta automáticamente.
- `STATUS_EXISTS_USERNAME` se considera ambiguo: puede indicar que un intento anterior sí creó la línea aunque su respuesta no llegara.
- Los demás estados `STATUS_*` distintos de éxito se consideran rechazos explícitos.
- El identificador, usuario, contraseña y vencimiento se toman de `data`; las credenciales deterministas se usan como respaldo si la API omite usuario o contraseña.

ClickTV documenta una URL HTTP y el usuario autorizó continuar con ella. La API key permanece exclusivamente en servidor (`.env.local` y variables privadas de Vercel), aunque el transporte HTTP implica que el proveedor y la red intermedia pueden observarla.

## Pruebas

Las pruebas automatizadas cubrirán:

- normalización del primer nombre y formato `nombretv123`;
- contraseña de exactamente 8 caracteres;
- estabilidad para una misma clave de idempotencia;
- diferencias entre solicitudes distintas;
- envío del formulario POST conforme a la documentación;
- aceptación exclusiva de `STATUS_SUCCESS`;
- clasificación segura de errores y respuestas ambiguas;
- conservación de paquetes `6` y `7`.

Después de aprobar las pruebas locales se realizará una única demo real controlada con paquete `7` y nombre `Prueba técnica NODO7`.
