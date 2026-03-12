# POS Permisos por acción (Frontend)

Fecha: 2026-03-12

## Objetivo
Ocultar o deshabilitar acciones en el POS según permisos del usuario.

## Origen de permisos
- Se consulta `GET /dashboard/overview` y se usa el listado de `permissions`.
- Se validan permisos tipo `pos.*` con soporte de `*` y `pos.*`.

## Acciones controladas
- Acceso al POS (`pos.access`)
- Abrir sesión (`pos.session.open`)
- Cerrar sesión (`pos.session.close`)
- Registrar venta (`pos.sale.create`)
- Registrar movimiento de caja (`pos.cash.move`)
- Registrar retiro (`pos.cash.withdrawal`)
- Ver historial de sesión (`pos.session.history`)

## Archivos modificados
- `angular/src/app/features/pos/pages/pos-terminal-page/pos-terminal-page.component.ts`
- `angular/src/app/features/pos/pages/pos-terminal-page/pos-terminal-page.component.html`
- `angular/src/app/features/pos/components/session-controls/pos-session-controls.component.ts`
- `angular/src/app/features/pos/components/session-controls/pos-session-controls.component.html`
- `angular/src/app/features/pos/components/totals-panel/pos-totals-panel.component.ts`
- `angular/src/app/features/pos/components/totals-panel/pos-totals-panel.component.html`

## Notas
- Se muestran mensajes claros cuando el usuario no tiene permiso.
- Las acciones se deshabilitan en UI sin romper el flujo base.
