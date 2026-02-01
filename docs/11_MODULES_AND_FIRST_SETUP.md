# Módulos dinámicos y Setup inicial (tipo Odoo)

Este documento conecta el comportamiento del backend `bc_server` (arquitectura modular) con el diseño del frontend `bc_angular`, y define un flujo de **primer arranque** similar a Odoo.

---

## 1. Arquitectura modular en el backend

En `bc_server` existe el módulo `module-loader`:

```txt
src/modules/module-loader/
  module-loader.controller.ts
  module-loader.module.ts
  module-loader.service.ts
  module.config.ts
```

### 1.1 `ModuleConfig`

En `module-loader/module.config.ts` se define:

```ts
export interface ModuleConfig {
  name: string;
  version: string;
  enabled: boolean;
  dependencies?: string[];
}
```

Esto significa que cada módulo del sistema puede describirse con:
- `name` → nombre único del módulo.
- `version` → versión semántica.
- `enabled` → si está activado.
- `dependencies` → otros módulos de los que depende.

### 1.2 `ModuleLoaderService`

El servicio `ModuleLoaderService` expone, entre otros, estos métodos:

- `listModules(): ModuleDescriptor[]`
- `enableModule(name: string): ModuleDescriptor`
- `disableModule(name: string): ModuleDescriptor`

`ModuleDescriptor` incluye el `config` y el estado resuelto de dependencias (`resolvedDependencies`, `missingDependencies`, `degraded`).

### 1.3 `ModuleLoaderController`

El controlador `ModuleLoaderController` está anotado con `@Controller('modules')`, por lo que, con el prefijo global `/api`, expone:

- `GET /api/modules` → `listModules()`
- `POST /api/modules/install` → habilitar módulo (`enableModule(name)`).
- `POST /api/modules/uninstall` → deshabilitar módulo (`disableModule(name)`).

El DTO `UpdateModuleStateDto` tiene un solo campo:

```ts
class UpdateModuleStateDto {
  @IsString()
  name!: string;
}
```

Así, el frontend puede habilitar/deshabilitar módulos enviando `{ "name": "products" }`, por ejemplo.

---

## 2. Descubrimiento de módulos en el frontend

El frontend debe utilizar estos endpoints para:

1. Conocer qué módulos existen y si están habilitados.
2. Construir un **menú lateral dinámico** (similar al de Odoo).
3. Activar/desactivar módulos desde una pantalla de configuración (futuro).

### 2.1 Servicio `ModulesApiService`

Archivo sugerido:

```txt
src/app/core/api/modules-api.service.ts
```

Responsabilidades:

- Consumir `GET /api/modules`.
- Exponer un tipo `ModuleInfo` basado en `ModuleConfig` y `ModuleDescriptor`, por ejemplo:

```ts
export interface ModuleInfo {
  name: string;
  version: string;
  enabled: boolean;
  dependencies: string[];
  resolvedDependencies: string[];
  missingDependencies: string[];
  degraded: boolean;
}
```

- Métodos adicionales:
  - `installModule(name: string)` → `POST /api/modules/install`.
  - `uninstallModule(name: string)` → `POST /api/modules/uninstall`.

### 2.2 Servicio `ModuleMenuService`

Archivo sugerido:

```txt
src/app/core/layout/module-menu.service.ts
```

Responsabilidades:

- Pedir la lista de módulos a `ModulesApiService`.
- Transformar los módulos habilitados (`enabled = true`) en ítems de menú, por ejemplo:

```ts
export interface MenuItem {
  label: string;
  icon?: string;
  routerLink?: string | any[];
  items?: MenuItem[];
}
```

- Exponer un `Observable<MenuItem[]>` que el `MainLayoutComponent` pueda usar para construir el sidebar (por ejemplo con `p-panelMenu` o `p-menu`).

> Nota: Actualmente `ModuleConfig` no incluye campos tipo `displayName` o `menu`. Si se necesita esa información, se puede extender en el futuro o inferir un menú simple (por ejemplo, usar `name` capitalizado y mapearlo a rutas conocidas).

---

## 3. Setup inicial (primer arranque) – Diseño futuro

Actualmente, **NO existe** en `bc_server` ningún módulo explícito para "system" o endpoints como:

- `/api/system/status`
- `/api/system/setup`

Sin embargo, para lograr un comportamiento tipo Odoo, se propone el siguiente diseño:

### 3.1 Estado del sistema

Endpoint propuesto (backend, futuro):

```txt
GET /api/system/status
```

Respuesta ejemplo:

```json
{
  "initialized": false,
  "dbName": null
}
```

Una vez inicializado el sistema:

```json
{
  "initialized": true,
  "dbName": "business_control_main"
}
```

### 3.2 Setup inicial

Endpoint propuesto (backend, futuro):

```txt
POST /api/system/setup
```

Payload ejemplo:

```json
{
  "dbName": "mi_tienda",
  "admin": {
    "name": "Admin",
    "email": "admin@mi-tienda.com",
    "password": "secreto"
  },
  "Organization": {
    "name": "Principal"
  },
  "company": {
    "name": "Mi Tienda, S.A."
  },
  "enabledModules": ["auth", "products", "inventory", "pos"]
}
```

El backend debería:

- Crear la base de datos / instancia o su equivalente lógico.
- Crear el usuario admin inicial.
- Crear el Organization inicial y la compañía.
- Marcar el sistema como inicializado (`initialized = true`).

> Recalcar: esto es un **diseño objetivo**; no está implementado aún en `bc_server`.

---

## 4. Integración del setup inicial en el frontend

Mientras no exista el módulo `system` en el backend, el frontend no puede completar este flujo, pero sí se puede preparar la estructura.

### 4.1 Servicios sugeridos

- `SystemStatusApiService` → `GET /api/system/status`
- `InitialSetupApiService` → `POST /api/system/setup`

Estos servicios deben incluir comentarios TODO indicando que dependen de la futura implementación en `bc_server`.

### 4.2 Página `InitialSetupPageComponent`

Ruta sugerida: `/setup/initial`.

Responsabilidades:

1. Consultar `SystemStatusApiService.getStatus()`:
   - Si `initialized = true`, redirigir a `/login`.
   - Si `initialized = false`, mostrar el wizard.

2. Wizard de configuración con secciones:
   - Nombre de instancia / base de datos (`dbName`).
   - Datos del usuario admin inicial.
   - Nombre del primer Organization.
   - Nombre de la compañía.
   - Selección de módulos a habilitar (lista proveniente de `ModulesApiService.getModules()`).

3. Al completar el wizard:
   - Llamar a `InitialSetupApiService.runSetup(payload)`.
   - Si tiene éxito, redirigir a `/login` para usar el flujo normal.

> De nuevo, esto requiere endpoints futuros en `bc_server`. Hasta que no se implementen, el wizard será sólo un prototipo.

---

## 5. Routing y guards relacionados

Una posible integración en `app.routes.ts` (cuando exista `SystemStatusApiService`) sería:

1. Al arranque, comprobar el estado del sistema.
2. Si no está inicializado, redirigir a `/setup/initial`.
3. Proteger rutas de app normal (`/`, `/dashboard`, etc.) con `AuthGuard`.

Mientras tanto, se puede mantener:

- `/setup/initial` desconectado (sólo UI de ejemplo), o
- No registrar la ruta hasta que los endpoints estén disponibles.

---

## 6. Relación con los prompts de Codex

El archivo `frontend_codex_prompts.txt` incluye prompts para:

- `ModulesApiService` (endpoints reales `/api/modules`).
- `ModuleMenuService` (construcción de menú).
- `SystemStatusApiService` y `InitialSetupApiService` (diseño futuro, con comentarios TODO).
- `InitialSetupPageComponent` (UI del wizard).

Estos prompts están marcados explícitamente para indicar qué partes dependen de endpoints ya existentes y cuáles requieren extensiones en el backend.
