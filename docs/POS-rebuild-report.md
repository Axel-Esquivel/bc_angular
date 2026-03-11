# POS Rebuild Report (Frontend)

Fecha: 2026-03-10

## Estructura final
- `angular/src/app/features/POS/`
  - `pos.module.ts`
  - `pos.routes.ts`
  - `pages/pos-terminal-page/*`
  - `components/product-selector/*`
  - `components/cart-lines-panel/*`
  - `components/totals-panel/*`
  - `services/pos.service.ts`
  - `services/products.service.ts`
  - `models/pos.model.ts`
  - `models/pos-product.model.ts`

## Componentes creados
- Terminal POS
- Selector de variantes
- Carrito
- Totales y pago

## Servicios creados
- `PosHttpService` (sesiones, ventas, post)
- `PosProductsService` (busqueda de variantes)

## Integraciones
- Validacion de stock previa a la venta con `InventoryApiService`.
- Manejo de errores con `MessageService`.

## Archivos modificados
- `angular/src/app/features/app/app.routes.ts`
- `angular/src/app/features/app/shell/app-shell.component.ts`
- `angular/src/app/features/app/pages/dashboard-page/dashboard-page.component.ts`
- `angular/src/app/core/layout/module-menu.service.ts`
- `angular/src/app/features/setup/pages/module-store-page/module-store-page.component.ts`

## Notas
- Uso consistente de `variantId`.
- UI con PrimeNG 20.
