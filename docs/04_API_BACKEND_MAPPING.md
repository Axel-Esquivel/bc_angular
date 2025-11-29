# Mapeo API Backend → Frontend

Este documento resume cómo se deben mapear los módulos del backend (`bc_server`) a servicios y pantallas en el frontend (`bc_angular`), **basado en el código real del servidor** y marcando explícitamente qué endpoints ya existen y cuáles son propuestas futuras.

---

## Base URL y prefijo

En `src/main.ts` del backend:

```ts
app.setGlobalPrefix('api');
```

Por tanto, la base en desarrollo es:

```txt
http://localhost:3000/api
```

En el frontend, esta URL debe estar configurada en `AppConfig` o `environment` como `apiBaseUrl`.

---

## Autenticación – `/api/auth`

Controlador (backend): `src/modules/auth/auth.controller.ts`

Endpoints **existentes**:

- `POST /api/auth/login` → `login(LoginDto)`
- `POST /api/auth/register` → `register(RegisterDto)`
- `POST /api/auth/refresh` → `refresh(RefreshTokenDto)`
- `GET /api/auth/me` → `me()` (protegido con `JwtAuthGuard`)

Frontend:

- Servicio: `src/app/core/api/auth-api.service.ts`
- Lógica de negocio: `src/app/core/auth/auth.service.ts`
- UI:
  - `features/auth/login-page`
  - `features/auth/register-page` (si se expone en UI)
  - Topbar mostrando el usuario actual a partir de `/auth/me`.

---

## Workspaces – `/api/workspaces`

Controlador: `src/modules/workspaces/workspaces.controller.ts`

Endpoints **existentes** (según código actual):

- `POST /api/workspaces`
  - Crea un workspace (`createWorkspace(CreateWorkspaceDto)`).
- `POST /api/workspaces/:id/members`
  - Agrega un miembro con rol a un workspace (`addMember(id, AddMemberDto)`).

Endpoints **recomendados a futuro** (NO existen aún en el código actual):

- `GET /api/workspaces`
  - Listar workspaces del usuario actual.
- `GET /api/workspaces/:id`
  - Detalle de un workspace.
- `PATCH /api/workspaces/:id`
  - Actualizar workspace.
- `DELETE /api/workspaces/:id`
  - Eliminar workspace.

Frontend:

- Servicio: `core/api/workspaces-api.service.ts`
- Páginas:
  - `features/workspaces/workspace-select-page` (requiere `GET /api/workspaces` para ser 100% funcional).
  - `features/workspaces/workspace-form-page` para crear/editar.

> Importante: mientras `GET /api/workspaces` no exista, el frontend puede:
> - Trabajar con datos simulados, o
> - Esperar a que se implemente el endpoint antes de conectar la UI real.

---

## Productos – `/api/products`

Controlador: `src/modules/products/products.controller.ts`

Endpoints **existentes** (patrón CRUD clásico):

- `POST /api/products` → crear producto.
- `GET /api/products` → listar productos.
- `GET /api/products/:id` → obtener producto por id.
- `PATCH /api/products/:id` → actualizar producto.
- `DELETE /api/products/:id` → eliminar producto.

Frontend:

- Servicio: `core/api/products-api.service.ts`
- Páginas:
  - `features/products/products-list-page`
  - `features/products/product-form-page`

---

## Compras – `/api/purchases`

Controlador: `src/modules/purchases/purchases.controller.ts`

Endpoints **existentes** (según el código actual):

- `GET /api/purchases/suggestions`
  - Genera sugerencias de compra según filtros (`PurchaseSuggestionQueryDto`).
- `POST /api/purchases/orders`
  - Crea órdenes de compra (`CreatePurchaseOrderDto`).
- `POST /api/purchases/orders/:id/confirm`
  - Confirma una orden de compra (`ConfirmPurchaseOrderDto`).
- `POST /api/purchases/grn`
  - Registra un “goods receipt” y actualiza stock (`CreateGoodsReceiptDto`).

Frontend:

- Servicio: `core/api/purchases-api.service.ts`
- Páginas:
  - `features/purchases/purchases-list-page` (para listar órdenes, cuando se implemente el endpoint correspondiente).
  - `features/purchases/purchase-order-form-page` para crear órdenes.
  - UI para sugerencias de compra y recepción de mercadería.

---

## Inventario – `/api/inventory`, `/api/inventory-counts`, `/api/warehouses`

Controladores en `src/modules/inventory`, `inventory-counts`, `warehouses`.

Patrones típicos vistos en el código:

- Inventario (`InventoryController`):
  - Consultas de existencias por producto/almacén.
- Conteos (`InventoryCountsController`):
  - Crear conteos físicos.
  - Registrar cantidades contadas.
  - Cerrar/aplicar conteos.
- Bodegas (`WarehousesController`):
  - CRUD de almacenes/bodegas.

Frontend:

- Servicios:
  - `core/api/inventory-api.service.ts`
  - `core/api/inventory-counts-api.service.ts`
  - `core/api/warehouses-api.service.ts`
- Páginas:
  - `features/inventory/inventory-list-page`
  - `features/inventory/inventory-movements-page`
  - `features/inventory/inventory-counts-page`

---

## POS – `/api/pos`

Controlador: `src/modules/pos` (revisar `pos.controller.ts`).

Funcionalidad típica:

- Crear ventas rápidas.
- Manejo básico de tickets/boletas.

Frontend:

- Servicio: `core/api/pos-api.service.ts`
- Página: `features/pos/pos-page`

---

## Clientes, proveedores, listas de precios, UOM y variantes

Módulos del backend:

- `customers` → `/api/customers`
- `providers` → `/api/providers`
- `price-lists` → `/api/price-lists`
- `uom` → `/api/uom`
- `variants` → `/api/variants`

Cada uno tiene sus controladores correspondientes en `src/modules/<modulo>`.  
La mayoría siguen un patrón CRUD.

Frontend:

- Servicios:
  - `customers-api.service.ts`
  - `providers-api.service.ts`
  - `price-lists-api.service.ts`
  - `uom-api.service.ts`
  - `variants-api.service.ts`
- Páginas bajo `features/settings` o `features/products`, según corresponda.

---

## Reportes y contabilidad

Módulos backend:

- `reports` → `/api/reports`
- `accounting` → rutas según configuración del módulo (balance, movimientos, etc.).

Frontend:

- Servicios:
  - `core/api/reports-api.service.ts`
  - `core/api/accounting-api.service.ts`
- Páginas:
  - `features/reports/reports-list-page`
  - `features/reports/report-viewer-page`
  - `features/accounting/accounting-summary-page`

El detalle exacto de endpoints debe leerse desde los controladores en `src/modules/reports` y `src/modules/accounting`.

---

## Seguridad: usuarios, roles, permisos, dispositivos

Módulos backend:

- `users` → `/api/users`
- `roles` → `/api/roles`
- `permissions` → `/api/permissions`
- `devices` → `/api/devices`

Frontend:

- Servicios:
  - `users-api.service.ts`
  - `roles-api.service.ts`
  - `permissions-api.service.ts`
  - `devices-api.service.ts`
- Páginas:
  - `features/settings/users`
  - `features/settings/roles`
  - `features/settings/permissions`
  - `features/settings/devices`

---

## Módulos dinámicos – `/api/modules`

Controlador: `src/modules/module-loader/module-loader.controller.ts`

Endpoints **existentes**:

- `GET /api/modules`
  - Devuelve la lista de módulos con su configuración y estado actual.
- `POST /api/modules/install`
  - Habilita un módulo por nombre (`enableModule(name)` en el servicio).
- `POST /api/modules/uninstall`
  - Deshabilita un módulo por nombre (`disableModule(name)` en el servicio).

La estructura base de `ModuleConfig` se encuentra en `module-loader/module.config.ts` e incluye:

- `name: string`
- `version: string`
- `enabled: boolean`
- `dependencies?: string[]`

Frontend:

- Servicio: `core/api/modules-api.service.ts`
- Servicio de layout: `core/layout/module-menu.service.ts` para transformar estos módulos en un menú lateral dinámico.

Más detalles en `docs/11_MODULES_AND_FIRST_SETUP.md`.

---

## Setup inicial (tipo Odoo)

Actualmente **NO existe** un controlador `system` ni endpoints como `/api/system/status` o `/api/system/setup` en el backend.

Sin embargo, el diseño propuesto para el frontend asume un flujo tipo Odoo:

- Si el sistema no está inicializado, se muestra un wizard de setup.
- En caso contrario, se usa el flujo normal de Login.

Este diseño futuro se describe en detalle en `docs/11_MODULES_AND_FIRST_SETUP.md` y en los prompts correspondientes del archivo de texto.  
Antes de que el frontend pueda usarlo, será necesario implementar estos endpoints en `bc_server`.
