# NODO7 Active Code Design

**Objetivo:** permitir que el administrador elija, al emitir cada código de acceso, si el visitante recibirá un **código de activación** o un par **usuario + contraseña**.

**Contexto:** hoy todos los códigos son iguales y siempre terminan en `create_line`. El contrato del proveedor (`https://ottpanel.tv/xm_reseller_api_doc.html`) expone `create_activecode` como acción hermana de `create_line`, con el mismo endpoint y el mismo envoltorio `{ status, data }`.

## Decisiones tomadas

- El **administrador** elige el tipo al crear el código. El visitante sigue eligiendo el paquete (6 o 7).
- La pantalla de resultado de un active code **solo muestra el código**, sin instrucciones de aplicación.
- El resultado del proveedor se modela como **unión discriminada**, para que el compilador obligue a manejar los dos casos.

## Contrato del proveedor

| | `create_line` | `create_activecode` |
|---|---|---|
| Parámetros propios | `username`, `password` | `code` |
| Devuelve | `id`, `username`, `password`, `exp_date` | `id`, `code` |
| Vencimiento | `exp_date` en la respuesta | **no lo devuelve** |

Ambas comparten `api_key`, `action`, `package`, `trial`, `is_isplock` y `reseller_notes`.

## Modelo de datos

Una sola columna nueva, en `demo_access_codes`:

```sql
alter table demo_access_codes
  add column credential_type text not null default 'line'
    check (credential_type in ('line','activecode'));
```

El `default 'line'` deja los códigos ya emitidos funcionando sin migración de datos.

`demo_requests` **no** guarda el tipo: se deriva del código de acceso al que pertenece, que es su única fuente de verdad. El repositorio ya trae ambas filas juntas.

El secreto reutiliza las columnas cifradas existentes:

| Columna | `line` | `activecode` |
|---|---|---|
| `username` | usuario | `null` |
| `password_ciphertext/iv/tag` | contraseña | código de activación |
| `provider_expires_at` | de `exp_date` | `null` |

## Corrección de la redacción

`redact_demo_audit()` borraba con `where provider_expires_at <= now()`. Como un active code no tiene `exp_date`, ese campo queda `NULL`, y `NULL <= now()` nunca es verdadero: **el secreto no se borraría nunca**. La regla pasa a ser:

```sql
where (
    provider_expires_at <= now()
    or (provider_expires_at is null
        and created_at <= now() - interval '7 days')
  )
  and password_ciphertext is not null
```

## Generación del código de activación

Determinista desde `idempotencyKey`, igual que usuario y contraseña. Un reintento pide el mismo código, así que el proveedor lo rechaza por duplicado en vez de crear un segundo demo y cobrar dos créditos.

Formato `N7` + 8 caracteres del alfabeto sin confusiones. Sin guiones, para distinguirlo del código de acceso, que sí los tiene.

El nombre del visitante viaja en `reseller_notes` en **ambos** tipos. En `line` el nombre ya va dentro del usuario; en `activecode` no hay nada más que lo identifique en el panel del proveedor.

## Clasificación de errores

`explicit` significa que no se creó nada y es seguro fallar limpio. `ambiguous` significa que algo pudo haberse creado y no se debe reintentar automáticamente.

| Estado | `line` | `activecode` |
|---|---|---|
| `STATUS_EXISTS_USERNAME` | ambiguous | — |
| `STATUS_FAILURE` | explicit | **ambiguous** |
| `STATUS_INVALID_PACKAGE`, `STATUS_NO_TRIALS`, `STATUS_INSUFFICIENT_CREDITS`, `STATUS_NO_PERMISSIONS`, `STATUS_INVALID_TYPE`, `STATUS_INVALID_DATA` | explicit | explicit |

`STATUS_FAILURE` cambia de significado según la acción porque la API **no tiene un estado de código duplicado**. En `line`, un duplicado se reporta como `STATUS_EXISTS_USERNAME`, así que un `STATUS_FAILURE` genérico es otra cosa. En `activecode` no existe ese estado dedicado, así que un fallo genérico puede ser nuestro propio código determinista ya creado.

## Tipos

```ts
export type DemoCredentialType = "line" | "activecode";

export type DemoResultView =
  | { kind: "line"; username: string; password: string;
      packageId: DemoPackageId; packageName: string; expiresAt: string | null }
  | { kind: "activecode"; code: string;
      packageId: DemoPackageId; packageName: string; expiresAt: null };
```

## Recorrido

```
Admin      → POST /api/admin/demo-codes { credentialType }
                └→ guarda credential_type junto al hash

Visitante  → ingresa código → sesión de 10 min          (sin cambios)

Visitante  → nombre + paquete
                └→ generateDemoForSession lee credential_type
                   └→ create_line | create_activecode
                   └→ guarda username (o null) + secreto cifrado
                   └→ devuelve la unión discriminada
```

La ventana de diez minutos, el rate limiting, el límite de tres intentos y la máquina de idempotencia no cambian.

## Interfaz

**Panel.** `CodeGenerator` gana un selector de dos opciones, con usuario y contraseña por defecto. El tipo se muestra junto al código recién creado, porque el administrador lo envía por WhatsApp y necesita saber qué está entregando. `CodeTable` lo muestra como etiqueta en cada fila.

**Portal.** `DemoSetupForm` no cambia. `DemoResult` ramifica según `kind`: para `activecode`, un único código grande y copiable. Como no hay `exp_date`, el pie dice que el tiempo empieza al activar el código, en vez del vencimiento.

## Alcance excluido

El envío por WhatsApp queda fuera de este trabajo y tendrá su propio diseño.
