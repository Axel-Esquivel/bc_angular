# Verificación final operativa POS (Frontend)

Fecha: 2026-03-12

## Estructura final
- `angular/src/app/features/pos/`
  - `pos.module.ts`
  - `pos.routes.ts`
  - `models/`
    - `pos.model.ts`
    - `pos-config.model.ts`
    - `pos-product.model.ts`
  - `services/`
    - `pos.service.ts`
    - `pos-configs.service.ts`
    - `products.service.ts`
  - `pages/`
    - `pos-terminal-page/`
    - `pos-configs-page/`
  - `components/`
    - `session-controls/`
    - `product-selector/`
    - `cart-lines/`
    - `totals-panel/`

## Implementación POS única
- Único módulo frontend POS bajo `angular/src/app/features/pos`.

## Rutas activas
- `/app/pos` → `PosTerminalPageComponent`
- `/app/pos/configs` → `PosConfigsPageComponent`

## Flujo funcional final
- PosConfig y acceso por usuario: selección obligatoria de POS permitido.
- Sesión POS: apertura/cierre con validaciones y estado visible.
- Apertura por denominaciones: formulario y cálculo automático.
- Cierre por denominaciones: diálogo con resumen, total contado y diferencia.
- Movimientos de caja: listado y diálogo para registro.
- Ventas e inventario: venta ligada a sesión y validación de stock.
- Permisos por acción: UI se oculta/deshabilita según permisos `pos.*`.

## Endpoints consumidos
- Configuración: `/pos/configs`, `/pos/configs/available/me`
- Sesiones: `/pos/sessions/open`, `/pos/sessions/active`, `/pos/sessions/:id/summary`, `/pos/sessions/close`
- Movimientos: `/pos/sessions/:id/movements`
- Ventas: `/pos/sales`, `/pos/sales/:id/post`
- Variantes: `/pos/variants/search`, `/pos/variants/by-code`

## Texto/encoding
- Textos visibles revisados y sin corrupción en POS.

## Pendientes
- Catálogo configurable de denominaciones por moneda.
- Permisos UI adicionales (descuentos/anulación/reimpresión) si se activan.

## Riesgos
- Si el rol no incluye permisos `pos.*`, la UI bloqueará acciones.

## Deuda técnica
- Parte de permisos se basan en `dashboard/overview`; si no se actualiza, se debe refrescar el token o forzar recarga.

## Siguientes mejoras recomendadas
1. Pantalla dedicada de historial de sesiones.
2. Reporte de caja por sesión con exportación.
3. Configuración de denominaciones por moneda desde settings.
