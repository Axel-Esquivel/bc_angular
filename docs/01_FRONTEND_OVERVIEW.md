# Business Control – Frontend Angular

Este proyecto es el **frontend web** de Business Control, construido con **Angular 20** y soporte de **SSR (Angular Universal)**. Su objetivo es consumir la API de `bc_server` y ofrecer una interfaz modular para pequeños negocios: ventas, inventarios, compras, contabilidad básica, reportes y administración de workspaces.

Este documento y los demás `.md` están pensados para trabajar con un agente (ChatGPT / Codex) que genere el código del frontend respetando la arquitectura del backend actual.

---

## Relación con el backend

Repositorio backend: `bc_server` (NestJS 11 + MongoDB).  
Repositorio frontend: `bc_angular` (Angular 20 SPA).

En `src/main.ts` del backend se establece el prefijo global:

```ts
app.setGlobalPrefix('api');
```

Por tanto, todos los controladores quedan expuestos como:

```txt
http://localhost:3000/api/<ruta-del-controlador>
```

Ejemplos de rutas a partir de los controladores detectados en `src/modules` del backend:

- `AuthController` → `/api/auth`
- `WorkspacesController` → `/api/workspaces`
- `ProductsController` → `/api/products`
- `PurchasesController` → `/api/purchases`
- `InventoryController` → `/api/inventory`
- `InventoryCountsController` → `/api/inventory-counts`
- `WarehousesController` → `/api/warehouses`
- `ProvidersController` → `/api/providers`
- `CustomersController` → `/api/customers`
- `PriceListsController` → `/api/price-lists`
- `UomController` → `/api/uom`
- `VariantsController` → `/api/variants`
- `PosController` → `/api/pos`
- `ReportsController` → `/api/reports`
- `Accounting` / contabilidad (según módulo `accounting`)
- `RolesController` → `/api/roles`
- `PermissionsController` → `/api/permissions`
- `UsersController` → `/api/users`
- `DevicesController` → `/api/devices`
- `ModuleLoaderController` → `/api/modules` (módulos dinámicos tipo Odoo)

> Nota: Las rutas exactas pueden variar ligeramente según cada controlador, pero la carpeta `src/modules` del backend es la fuente de verdad para endpoints existentes.

---

## Objetivos principales del frontend

1. **Shell / layout principal**
   - Topbar con:
     - Nombre del sistema.
     - Usuario actual (obtenido desde `/api/auth/me`).
     - Selector de tema (claro/oscuro).
     - Selector de idioma (es/en).
   - Sidebar dinámico basado en módulos activos (consulta a `/api/modules`).
   - Contenido central con `router-outlet` y routing lazy.

2. **Autenticación**
   - Login con `/api/auth/login` usando DTO `LoginDto` del backend.
   - Registro (si se habilita) mediante `/api/auth/register`.
   - Refresh de token con `/api/auth/refresh`.
   - Perfil actual con `/api/auth/me` (requiere `JwtAuthGuard` en backend).

3. **Workspaces y multiempresa**
   - En backend existe `WorkspacesController` con:
     - `POST /api/workspaces` → crear workspace.
     - `POST /api/workspaces/:id/members` → agregar miembro.
   - A futuro se recomienda agregar `GET /api/workspaces` para listar los workspaces del usuario. Mientras no exista, el frontend puede usar datos simulados o esperar su implementación.

4. **Módulos dinámicos (tipo Odoo)**
   - Backend expone `ModuleLoaderController` bajo `/api/modules` con:
     - `GET /api/modules` → listar módulos y estados.
     - `POST /api/modules/install` → habilitar módulo.
     - `POST /api/modules/uninstall` → deshabilitar módulo.
   - El frontend debe usar esta información para:
     - Construir el menú lateral dinámico.
     - Saber qué secciones mostrar/ocultar.

5. **Módulos funcionales de negocio**
   - **Productos** (`/api/products`)
   - **Inventario** (`/api/inventory`, `/api/inventory-counts`, `/api/warehouses`)
   - **Compras** (`/api/purchases`)
   - **POS** (`/api/pos`)
   - **Clientes y proveedores** (`/api/customers`, `/api/providers`)
   - **Listas de precios y UOM** (`/api/price-lists`, `/api/uom`)
   - **Reportes y contabilidad** (`/api/reports`, módulo `accounting`)
   - **Seguridad** (`/api/users`, `/api/roles`, `/api/permissions`, `/api/devices`)

6. **Tiempo real (Sockets)**
   - Uso de `socket.io` en backend (ver carpeta `src/realtime`).
   - El frontend debe exponer un `SocketService` para conectar al servidor y manejar eventos (chat, notificaciones, etc.).

7. **I18n y temas**
   - Idioma por defecto: español.
   - Mínimo dos idiomas: `es` y `en`.
   - Temas de PrimeNG 20 con soporte de tema claro/oscuro.

---

## Convenciones generales del frontend

- Angular 20 con componentes standalone.
- Aplicación como **SPA** (Single Page Application) sin SSR ni archivos `main.server.ts` / `server.ts` / `app.config.server.ts`.
- Organización en:
  - `core/` → servicios transversales (auth, api, sockets, i18n, theme, layout).
  - `shared/` → componentes reutilizables, pipes, directivas, modelos comunes.
  - `features/` → módulos de negocio (auth, workspaces, products, inventory, pos, purchases, reports, settings, etc.).

Este archivo sirve como **visión general**. Los demás `.md` detallan stack, estructura, mapeo de endpoints, tareas y prompts para el agente.
