# Frontend Feature Module Audit Report

Scope: `angular/src/app/features` (Angular)

**Resumen**
1. `angular/src/app/features/app/app.routes.ts` usa rutas directas a componentes de `inventory` y `warehouses` (carga estatica) y un matcher generico que envia modulos desconocidos a `ModulePlaceholderPageComponent`.
2. `angular/src/app/features/app/pages/dashboard-page/dashboard-page.component.ts` expone rutas para modulos sin implementacion real (`/app/accounting`, `/app/customers`, `/app/reports`, `/app/companies`, `/app/branches`), que terminan en el placeholder.
3. Features sin rutas registradas: `companies`, `reports`. Sus paginas no son alcanzables desde el router.
4. Duplicados/huérfanos: `angular/src/app/features/companies/pages/warehouses-page` y `angular/src/app/features/companies/pages/branches-page` no tienen rutas registradas y duplican funcionalidad con `features/warehouses` o rutas inexistentes.

**Placeholder y rutas genericas**
1. Matcher generico en `angular/src/app/features/app/app.routes.ts` -> `ModulePlaceholderPageComponent`.
2. Placeholder en `angular/src/app/features/app/modules/module-placeholder-page/module-placeholder-page.component.ts`.

| Modulo (feature) | Ubicacion | Dependencias declaradas | Dependencias reales (imports) | Estado | Riesgos | Recomendacion |
| --- | --- | --- | --- | --- | --- | --- |
| app | `src/app/features/app` | N/A | inventory, setup, warehouses | inconsistente | Dependencias cross-feature directas: inventory, setup, warehouses. | Reemplazar imports directos por APIs/shared contracts o guards de disponibilidad. |
| auth | `src/app/features/auth` | N/A | - | correcto | Sin hallazgos mayores en rutas/acoplamientos. | Sin cambios recomendados en esta fase. |
| companies | `src/app/features/companies` | N/A | - | obsoleto | Feature no aparece en rutas (`app.routes.ts` / `features/app/app.routes.ts`). | Registrar rutas o mover/retirar el feature si esta deprecado. |
| context | `src/app/features/context` | N/A | - | correcto | Sin hallazgos mayores en rutas/acoplamientos. | Sin cambios recomendados en esta fase. |
| inventory | `src/app/features/inventory` | N/A | warehouses | inconsistente | Dependencias cross-feature directas: warehouses. | Reemplazar imports directos por APIs/shared contracts o guards de disponibilidad. |
| pos | `src/app/features/pos` | N/A | price-lists | inconsistente | Dependencias cross-feature directas: price-lists. | Reemplazar imports directos por APIs/shared contracts o guards de disponibilidad. |
| prepaid | `src/app/features/prepaid` | N/A | - | correcto | Sin hallazgos mayores en rutas/acoplamientos. | Sin cambios recomendados en esta fase. |
| price-lists | `src/app/features/price-lists` | N/A | purchases | inconsistente | Dependencias cross-feature directas: purchases. | Reemplazar imports directos por APIs/shared contracts o guards de disponibilidad. |
| products | `src/app/features/products` | N/A | - | correcto | Sin hallazgos mayores en rutas/acoplamientos. | Sin cambios recomendados en esta fase. |
| providers | `src/app/features/providers` | N/A | - | correcto | Sin hallazgos mayores en rutas/acoplamientos. | Sin cambios recomendados en esta fase. |
| purchases | `src/app/features/purchases` | N/A | providers, warehouses | inconsistente | Dependencias cross-feature directas: providers, warehouses. | Reemplazar imports directos por APIs/shared contracts o guards de disponibilidad. |
| reports | `src/app/features/reports` | N/A | - | obsoleto | Feature no aparece en rutas (`app.routes.ts` / `features/app/app.routes.ts`). | Registrar rutas o mover/retirar el feature si esta deprecado. |
| settings | `src/app/features/settings` | N/A | price-lists | inconsistente | Dependencias cross-feature directas: price-lists. | Reemplazar imports directos por APIs/shared contracts o guards de disponibilidad. |
| setup | `src/app/features/setup` | N/A | - | correcto | Sin hallazgos mayores en rutas/acoplamientos. | Sin cambios recomendados en esta fase. |
| warehouses | `src/app/features/warehouses` | N/A | - | correcto | Sin hallazgos mayores en rutas/acoplamientos. | Sin cambios recomendados en esta fase. |
