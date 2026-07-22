# Bloque A — Vencimientos Mejorado

**Fecha:** 2026-05-17  
**Estado:** Aprobado por usuario

## Funcionalidades

### 1. Dialog post-renovación
Tras renovar una línea individual, en vez de copiar al portapapeles, mostrar un `Dialog` con:
- Mensaje renderizado con datos reales
- Botón "Abrir WhatsApp" (abre `whatsapp_url` del render)
- Botón "Copiar mensaje"
- Link "Cerrar sin enviar"

### 2. Renovación masiva
- Checkboxes en cada tarjeta (visibles cuando hay al menos una seleccionada)
- Barra flotante fija en el bottom: "N seleccionadas · Renovar N · ✕"
- Botón "Sel. todo" por sección (hoy / próximos 3 días / 4-7 días)
- Ejecución secuencial con `mutateAsync`
- Al terminar: `BulkResultsModal` con lista de resultados (✓/✗ por línea) y botones WhatsApp/Copiar por cada una exitosa

### 3. Cola de recordatorios WhatsApp
- Botón "Recordatorios (N)" en el header de "Vencen hoy"
- Separa lines con/sin teléfono al abrir
- Muestra una a la vez: info del cliente + mensaje renderizado
- "Abrir WhatsApp" → detecta retorno de foco → muestra "¿Enviaste?" → "Sí, enviado" / "No enviado"
- Progress bar y contador "X de N"
- Pantalla final: resumen enviados / saltados / sin teléfono

### 4. Filtro "Sin cliente vinculado"
- Pill toggle en la barra de filtros junto a plataforma
- Muestra badge con count de líneas sin cliente
- Se limpia junto con "Limpiar filtros"

## Componentes nuevos (en page.tsx)
- `PostRenewDialog`
- `BulkResultsModal`
- `ReminderQueueModal`
- `ExpiringCard` actualizada con prop `selected` / `selectionMode`

## Estado nuevo en page
```
postRenewDialog: PostRenewData | null
selectedIds: Set<string>
bulkRenewing: boolean
bulkResults: BulkResult[] | null
reminderQueueOpen: boolean
unlinkedOnly: boolean
```
