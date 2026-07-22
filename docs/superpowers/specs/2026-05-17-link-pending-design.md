# Vincular Pendientes — `/clients/link-pending`

**Fecha:** 2026-05-17 | **Estado:** Aprobado

## Problema
Hay muchas líneas sin cliente vinculado. El flujo actual requiere navegar línea por línea en páginas distintas. Se necesita un modo dedicado que permita procesar todas rápidamente.

## Diseño

### Layout split
- **Panel izquierdo (w-72):** Cola de todas las líneas sin cliente. Progress bar + stats (vinculadas / saltadas / pendientes). Lista scrolleable, click para saltar a cualquiera.
- **Panel derecho (flex-1):** Área de trabajo. Card de la línea actual + buscador de cliente + formulario de creación rápida + navegación.

### Flujo
1. Carga todas las líneas sin cliente (`GET /api/lines?unlinked=true&limit=500`)
2. Primera línea seleccionada automáticamente
3. Usuario busca cliente existente → selecciona → "Vincular"
4. O crea nuevo cliente inline (nombre opcional + teléfono)
5. Al vincular/saltar → avanza automáticamente al siguiente pendiente
6. Pantalla de resumen cuando no quedan pendientes

### Acceso
Botón "Vincular pendientes (N)" en el header de `/clients`

### Atajos de teclado
- `/` → foco al buscador
- `Esc` → saltar línea actual
- `Enter` → vincular cuando hay cliente seleccionado

### APIs usadas
- `GET /api/lines?unlinked=true&limit=500`
- `GET /api/clients?search=X`
- `POST /api/clients` (crear)
- `POST /api/clients/:id/link-line` (vincular)
