# POS Configuración y acceso por usuario (Frontend)

Fecha: 2026-03-12

## Objetivo
Agregar UI y servicios para gestionar configuraciones de POS, con selección de usuarios permitidos y vínculo con el POS terminal.

## Archivos creados
- `angular/src/app/features/pos/models/pos-config.model.ts`
- `angular/src/app/features/pos/services/pos-configs.service.ts`
- `angular/src/app/features/pos/pages/pos-configs-page/pos-configs-page.component.ts`
- `angular/src/app/features/pos/pages/pos-configs-page/pos-configs-page.component.html`
- `angular/src/app/features/pos/pages/pos-configs-page/pos-configs-page.component.scss`

## Archivos modificados
- `angular/src/app/features/pos/pos.routes.ts`
- `angular/src/app/features/pos/pos.module.ts`
- `angular/src/app/features/pos/pages/pos-terminal-page/pos-terminal-page.component.ts`
- `angular/src/app/features/pos/pages/pos-terminal-page/pos-terminal-page.component.html`
- `angular/src/app/features/pos/components/session-controls/pos-session-controls.component.ts`
- `angular/src/app/features/pos/components/session-controls/pos-session-controls.component.html`
- `angular/src/app/features/pos/components/session-controls/pos-session-controls.component.scss`
- `angular/src/app/features/pos/components/totals-panel/pos-totals-panel.component.ts`
- `angular/src/app/features/pos/components/totals-panel/pos-totals-panel.component.html`
- `angular/src/app/features/pos/models/pos.model.ts`
- `angular/src/app/features/pos/services/pos.service.ts`

## Endpoints consumidos
- `GET /pos/configs`
- `GET /pos/configs/available/me`
- `POST /pos/configs`
- `PATCH /pos/configs/:id`
- `DELETE /pos/configs/:id`

## Integración en POS terminal
- Se carga la lista de POS permitidos al usuario.
- Se exige seleccionar POS antes de abrir sesión o vender.
- Se transmite `posConfigId` en apertura, cierre y sesión activa.
- Se filtran métodos de pago según configuración del POS.

## Pendientes
- Validaciones UX adicionales (ejemplo: mostrar detalle de currency en POS).
- Filtro avanzado por sucursal/almacén si se requiere fuera del contexto activo.
