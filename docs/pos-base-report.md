# POS Base Report (Frontend)

Fecha: 2026-03-11

## Estructura creada
- `angular/src/app/features/pos/`
  - `pos.module.ts`
  - `pos.routes.ts`
  - `pages/pos-terminal-page/*`
  - `components/product-selector/*`
  - `components/cart-lines/*`
  - `components/totals-panel/*`
  - `components/session-controls/*`
  - `services/pos.service.ts`
  - `services/products.service.ts`
  - `models/pos.model.ts`
  - `models/pos-product.model.ts`

## Integraciones funcionales
- Variantes reales desde `/pos/variants/search` y `/pos/variants/by-code`.
- Precio base mostrado desde respuesta de variantes.
- Validación de stock con `InventoryApiService.getVariantStock` antes de confirmar venta.
- Almacenes cargados desde `/warehouses` con filtros `organizationId` y `enterpriseId`.
- Sesión activa consultada en `/pos/sessions/active`.

## Sesión/caja en UI
- Estado visible de sesión activa o cerrada.
- Monto de apertura visible mientras la sesión está activa.
- Bloqueo de abrir sesión si ya hay sesión activa.

## Componentes creados
- Terminal POS
- Selector/buscador de variantes
- Panel de carrito
- Panel de totales
- Controles de sesión y almacén

## Decisiones tomadas
- Ruta POS en `/app/pos` usando `features/pos`.
- Pago base solo en efectivo (sin integraciones opcionales).
- Manejo de errores visibles con `p-toast`.

## Pendientes para siguientes fases
- Métodos de pago adicionales.
- Selector de clientes y descuentos.
- Atajos de teclado y mejoras de UX.
