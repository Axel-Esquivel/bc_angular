# Estructura del proyecto – Frontend Angular

Basado en el repositorio `bc_angular` actual y en la forma de trabajo del backend `bc_server`.

---

## Raíz del proyecto

Archivos principales:

- `angular.json` → configuración de builds SPA y estilos.
- `package.json` → scripts y dependencias.
- `tsconfig*.json` → configuración TypeScript.
- `src/` → código fuente de la app.
- `public/` → recursos estáticos.

---

## Estructura sugerida en `src/app`

```txt
src/app/
  app.ts
  app.html
  app.scss
  app.routes.ts
  app.config.ts
  app.config.server.ts

  core/
    api/
      api-client.service.ts      (opcional, si quieres un wrapper genérico)
      auth-api.service.ts
      workspaces-api.service.ts
      products-api.service.ts
      inventory-api.service.ts
      inventory-counts-api.service.ts
      warehouses-api.service.ts
      purchases-api.service.ts
      pos-api.service.ts
      providers-api.service.ts
      customers-api.service.ts
      price-lists-api.service.ts
      uom-api.service.ts
      variants-api.service.ts
      reports-api.service.ts
      accounting-api.service.ts
      roles-api.service.ts
      permissions-api.service.ts
      users-api.service.ts
      devices-api.service.ts
      modules-api.service.ts      (para `/api/modules`)
      system-status-api.service.ts (futuro: `/api/system/status`)
      initial-setup-api.service.ts (futuro: `/api/system/setup`)
    auth/
      auth.service.ts
      token-storage.service.ts
      auth.guard.ts
      auth.interceptor.ts
    layout/
      layout.service.ts
      module-menu.service.ts      (para menú dinámico usando `/api/modules`)
    realtime/
      socket.service.ts
      notification.service.ts
    i18n/
      translation.service.ts
      translations.es.ts
      translations.en.ts
    theme/
      theme.service.ts

  shared/
    components/
      bc-table/
      bc-card/
      bc-form-field/
      bc-toolbar/
    directives/
    pipes/
      translate.pipe.ts
      currency.pipe.ts
    models/
      api-response.model.ts
      pagination.model.ts
      common-types.ts

  features/
    auth/
      login-page/
      register-page/
      forgot-password-page/
    setup/
      initial-setup-page/          (wizard para primer arranque – futuro)
    workspaces/
      workspace-select-page/
      workspace-form-page/
    layout/
      main-layout/
    dashboard/
      dashboard-page/
    products/
      products-list-page/
      product-form-page/
    inventory/
      inventory-list-page/
      inventory-movements-page/
      inventory-counts-page/
    pos/
      pos-page/
    purchases/
      purchases-list-page/
      purchase-order-form-page/
    reports/
      reports-list-page/
      report-viewer-page/
    settings/
      users/
      roles/
      permissions/
      devices/
      companies/
      branches/
      currencies/
```

> Los nombres exactos de carpetas/páginas pueden adaptarse a lo que ya exista en `bc_angular`, pero esta estructura sirve como referencia para el agente.

---

## Convenciones de código

- TypeScript estricto activado.
- Evitar `any` salvo donde sea necesario (por ejemplo, respuestas genéricas del backend).
- Mantener una clase/servicio/componente por archivo.

Componentes standalone:

- Decorador `@Component({ standalone: true, ... })`.
- Importar módulos necesarios de Angular y PrimeNG directamente en cada componente (o usar `imports: [CommonModule, RouterModule, ...]`).

Servicios:

- Servicios de infraestructura y transversales → en `core/`.
- Servicios de API por módulo → en `core/api/`.
- Servicios de estado específico de un feature (si se necesitan) → en `features/<feature>/services/`.

---

## Routing

Archivo principal: `src/app/app.routes.ts`.

Esquema propuesto:

- Rutas públicas:
  - `/setup/initial` (futuro: wizard de primer arranque; solo si el sistema no está inicializado).
  - `/login` (pantalla de login).
- Ruta protegida:
  - `/` → `MainLayoutComponent` protegida por `AuthGuard`.
  - Children:
    - `/dashboard`
    - `/products`
    - `/pos`
    - etc.

El guard o un resolver puede consultar `SystemStatusApiService` (una vez implementado el backend) para decidir si se debe redirigir al wizard `/setup/initial`.

---

## Integración estricta con el backend

- Todas las rutas que comienzan con `/api/` corresponden a controladores reales en `bc_server/src/modules`.
- Si un endpoint aún **no existe** en el backend (por ejemplo `GET /api/workspaces` o `/api/system/status`), los `.md` lo marcarán como **“diseño objetivo / futuro”** para que sea claro qué está implementado y qué falta.

El objetivo de esta documentación es que el frontend y el backend evolucionen juntos.
