# POS Audit Report (Frontend)

Fecha: 2026-03-10

**Estructura actual**
- `angular/src/app/features/pos/`
  - `pos.module.ts`, `pos.routes.ts`
  - `pages/pos-terminal-page/*`
  - `components/`
    - `product-selector`
    - `cart-lines-panel`
    - `totals-panel`
  - `services/pos.service.ts` (POS backend)
  - `services/products.service.ts` (lookup de variantes)
  - `models/pos-product.model.ts`
- `angular/src/app/core/api/pos-api.service.ts` (carritos)
- `angular/src/app/shared/models/pos.model.ts`

**Hallazgos**
- Inconsistencia `productId` vs `variantId`:
  - POS usa variantes (`/products/search`, `/products/by-code`) pero el carrito y payloads usaban `productId`.
- Enum de pagos en frontend limitado a `CASH` mientras backend soporta `CASH|CARD|VOUCHER|TRANSFER`.
- Integraciones opcionales (price-lists, prepaid) ya estaban protegidas por `modulesOverview`, pero el tipado no reflejaba variantes.

**Correcciones aplicadas**
- `PosCartLine` ahora usa `variantId`.
- Payloads POS (`CreatePosSalePayload`, `PosSaleLineInput`) usan `variantId`.
- `PosApiService.addLine` usa `variantId`.
- UI de líneas actualizada para usar `variantId`.
- Enum de pagos alineado a backend (sin cambiar UI, sigue mostrando efectivo).

**Deuda técnica pendiente**
- Flujo de carritos (`PosApiService`) no está integrado al terminal actual.
- UI todavía sólo expone pago en efectivo; si se habilitan otros métodos se requiere UI adicional.
- Mejorar manejo de errores de disponibilidad si backend de módulos opcionales no responde.

**Recomendación**
Continuar sobre esta base. No es necesario crear POS nuevo; el ajuste principal era coherencia de IDs y tipados.
