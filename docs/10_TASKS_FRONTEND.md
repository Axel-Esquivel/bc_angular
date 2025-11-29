# Tasks – Frontend Angular

Lista de tareas de alto nivel para construir el frontend de Business Control, alineado con el backend actual y las extensiones futuras planeadas.

---

## Sprint 0 – Shell + Auth + Workspace

- [ ] Definir `AppConfig` y registrarlo en `app.config.ts`.
- [ ] Crear modelo `ApiResponse<T>` y tipos comunes.
- [ ] Crear servicios de API:
  - [ ] `auth-api.service.ts`
  - [ ] `workspaces-api.service.ts` (con nota de endpoint `GET /workspaces` futuro).
- [ ] Implementar core de autenticación:
  - [ ] `TokenStorageService`
  - [ ] `AuthService`
  - [ ] `AuthInterceptor`
  - [ ] `AuthGuard`
- [ ] Implementar layout principal:
  - [ ] `MainLayoutComponent` con topbar + sidebar + router-outlet.
  - [ ] `app.routes.ts` con rutas `/login`, `/workspaces/select`, `/` y `/dashboard`.
- [ ] Implementar páginas:
  - [ ] `LoginPageComponent`
  - [ ] `WorkspaceSelectPageComponent` (pendiente de endpoint real para listar workspaces).

---

## Sprint 1 – Catálogo y productos

- [ ] Servicios de API:
  - [ ] `products-api.service.ts`
  - [ ] `variants-api.service.ts`
  - [ ] `uom-api.service.ts`
  - [ ] `price-lists-api.service.ts`
  - [ ] `providers-api.service.ts`
  - [ ] `customers-api.service.ts`
- [ ] Páginas:
  - [ ] Listado de productos (`products-list-page`).
  - [ ] Formulario de producto (`product-form-page`).
  - [ ] Listado de proveedores y clientes (en `features/settings`).

---

## Sprint 2 – Inventario e inventarios físicos

- [ ] Servicios de API:
  - [ ] `inventory-api.service.ts`
  - [ ] `inventory-counts-api.service.ts`
  - [ ] `warehouses-api.service.ts`
- [ ] Páginas:
  - [ ] `inventory-list-page` (existencias por almacén).
  - [ ] `inventory-movements-page`.
  - [ ] `inventory-counts-page` (flujo de conteo físico).

---

## Sprint 3 – POS

- [ ] Servicio de API:
  - [ ] `pos-api.service.ts`
- [ ] Página:
  - [ ] `pos-page` con layout básico:
    - [ ] Búsqueda de producto.
    - [ ] Carrito.
    - [ ] Totales.
    - [ ] Botón para confirmar venta.

---

## Sprint 4 – Reportes y contabilidad

- [ ] Servicios:
  - [ ] `reports-api.service.ts`
  - [ ] `accounting-api.service.ts`
- [ ] Páginas:
  - [ ] `reports-list-page`
  - [ ] `report-viewer-page`
  - [ ] `accounting-summary-page` (resumen contable).

---

## Sprint 5 – Seguridad y configuración

- [ ] Servicios:
  - [ ] `users-api.service.ts`
  - [ ] `roles-api.service.ts`
  - [ ] `permissions-api.service.ts`
  - [ ] `devices-api.service.ts`
- [ ] Páginas:
  - [ ] Gestión de usuarios.
  - [ ] Gestión de roles.
  - [ ] Gestión de permisos.
  - [ ] Gestión de dispositivos.

---

## Sprint 6 – Módulos dinámicos y menú (tipo Odoo)

- [ ] Servicio `modules-api.service.ts` para `/api/modules`.
- [ ] Servicio `module-menu.service.ts` para construir el menú lateral dinámico.
- [ ] Integrar el menú dinámico en `MainLayoutComponent`.

---

## Sprint 7 – Setup inicial (primer arranque)

> Diseño futuro: requiere implementar primero endpoints en backend (`/api/system/status` y `/api/system/setup`).

- [ ] Servicio `system-status-api.service.ts` (GET `/system/status`).
- [ ] Servicio `initial-setup-api.service.ts` (POST `/system/setup`).
- [ ] Página `InitialSetupPageComponent` (`/setup/initial`) con wizard:
  - [ ] Nombre de instancia / base de datos.
  - [ ] Admin inicial.
  - [ ] Workspace inicial.
  - [ ] Compañía inicial.
  - [ ] Selección de módulos activos.

---

## Sprint 8 – i18n y temas

- [ ] Implementar `TranslationService` + `TranslatePipe`.
- [ ] Implementar `ThemeService` para cambio de tema.
- [ ] Agregar selectores de idioma y tema en el layout.
