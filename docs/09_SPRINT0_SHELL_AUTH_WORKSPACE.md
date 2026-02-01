# Sprint 0 – Shell, Layout, Auth base y Organization

Objetivo: tener lo mínimo para:

1. Loguearse contra el backend real.
2. Preparar selección de Organization.
3. Mostrar un layout principal con menú.

> Importante: en el backend actual NO existe todavía `GET /api/Organizations`. Este sprint asume que se implementará en algún momento; mientras tanto, se puede trabajar con datos simulados o dejar la funcionalidad de selección de Organization pendiente de conexión.

---

## Orden de archivos sugeridos

### 1. Config general de app (AppConfig)

**Archivo**: `src/app/core/config/app-config.ts`

Prompt sugerido:

> Genera EXCLUSIVAMENTE el contenido de `src/app/core/config/app-config.ts` con:
> - Interface `AppConfig` con: `apiBaseUrl`, `socketUrl`, `defaultLanguage`, `supportedLanguages`, `defaultTheme`, `availableThemes`.
> - InjectionToken `APP_CONFIG` y constante `APP_CONFIG_VALUE` con valores por defecto para desarrollo:
>   - apiBaseUrl: 'http://localhost:3000/api'
>   - socketUrl: 'http://localhost:3000'
>   - defaultLanguage: 'es'
>   - supportedLanguages: ['es', 'en']
>   - defaultTheme: 'lara-light-blue'
>   - availableThemes: ['lara-light-blue', 'lara-dark-blue'].
> - Compatible con Angular 20 y TypeScript estricto.

---

### 2. Modelos base compartidos

**Archivo**: `src/app/shared/models/api-response.model.ts`

Prompt sugerido:

> Genera EXCLUSIVAMENTE el contenido de `src/app/shared/models/api-response.model.ts` con:
> - Interface genérica `ApiResponse<T>` compatible con el backend:
>   - status: 'success' | 'error'
>   - message: string
>   - result: T
>   - error: any
> - Opcional: interface `PaginatedResponse<T>` con `items: T[]` y `total: number`.
> - Código listo para Angular 20 y TypeScript estricto.

---

### 3. Servicios de API (auth y Organizations)

**Archivo**: `src/app/core/api/auth-api.service.ts`

Prompt sugerido:

> Genera EXCLUSIVAMENTE el contenido de `src/app/core/api/auth-api.service.ts` con:
> - Servicio inyectable `AuthApiService`.
> - Métodos:
>   - `login(dto: { email: string; password: string })` → POST `/auth/login`
>   - `register(dto: { name: string; email: string; password: string })` → POST `/auth/register`
>   - `refresh(dto: { refreshToken: string })` → POST `/auth/refresh`
>   - `me()` → GET `/auth/me`
> - Cada método debe usar `HttpClient` y `APP_CONFIG.apiBaseUrl`.
> - Retornos como `Observable<ApiResponse<any>>`.

**Archivo**: `src/app/core/api/Organizations-api.service.ts`

Prompt sugerido (incluye nota sobre endpoint aún no implementado):

> Genera EXCLUSIVAMENTE el contenido de `src/app/core/api/Organizations-api.service.ts` con:
> - Servicio inyectable `OrganizationsApiService`.
> - Métodos:
>   - `createOrganization(dto: { name: string; description?: string })` → POST `/Organizations` (endpoint EXISTENTE).
>   - `addMember(OrganizationId: string, dto: { userId: string; roleId: string })` → POST `/Organizations/:id/members` (endpoint EXISTENTE).
>   - `listMyOrganizations()` → GET `/Organizations` (ENDPOINT FUTURO: aún no existe en el backend; deja un comentario TODO indicando que debe implementarse en `OrganizationsController` de bc_server).
> - Debe usar `HttpClient`, `APP_CONFIG` y `ApiResponse<T>`.

---

### 4. Auth core

**Archivo**: `src/app/core/auth/token-storage.service.ts`

Prompt sugerido:

> Genera EXCLUSIVAMENTE el contenido de `src/app/core/auth/token-storage.service.ts` con:
> - Servicio `TokenStorageService`.
> - Métodos:
>   - `setToken(token: string): void`
>   - `getToken(): string | null`
>   - `clearToken(): void`
> - Usar `localStorage` bajo una clave como `bc_token`.

**Archivo**: `src/app/core/auth/auth.service.ts`

Prompt sugerido:

> Genera EXCLUSIVAMENTE el contenido de `src/app/core/auth/auth.service.ts` con:
> - Servicio `AuthService` que use `AuthApiService` y `TokenStorageService`.
> - Gestión de usuario actual con un `BehaviorSubject<any | null>`.
> - Métodos:
>   - `login(credentials: { email: string; password: string }): Observable<void>` → llama a `AuthApiService.login`, guarda token y actualiza usuario actual.
>   - `logout(): void` → limpia token y usuario actual.
>   - `loadMe(): Observable<void>` → llama a `AuthApiService.me` y actualiza usuario actual.
>   - `getCurrentUser(): Observable<any | null>` → observable del usuario actual.
>   - `isAuthenticated(): boolean` → true si hay token almacenado.
> - Código listo para Angular 20.

**Archivo**: `src/app/core/auth/auth.interceptor.ts`

Prompt sugerido:

> Genera EXCLUSIVAMENTE el contenido de `src/app/core/auth/auth.interceptor.ts` con:
> - HttpInterceptor que:
>   - Lee el token desde `TokenStorageService`.
>   - Agrega header `Authorization: Bearer <token>` a las peticiones cuyo origen sea `APP_CONFIG.apiBaseUrl`.
> - Preparado para registrarse como provider multi de `HTTP_INTERCEPTORS` en `app.config.ts`.

**Archivo**: `src/app/core/auth/auth.guard.ts`

Prompt sugerido:

> Genera EXCLUSIVAMENTE el contenido de `src/app/core/auth/auth.guard.ts` con:
> - Guard `AuthGuard` (puede ser clase o `CanActivateFn`) que:
>   - Usa `AuthService.isAuthenticated()`.
>   - Si NO está autenticado, navega a `/login` y retorna `false`.
>   - Si está autenticado, retorna `true`.

---

### 5. Layout principal

**Archivos**:

- `src/app/features/layout/main-layout/main-layout.component.ts`
- `src/app/features/layout/main-layout/main-layout.component.html`
- `src/app/features/layout/main-layout/main-layout.component.scss`

Prompt sugerido:

> Genera EXCLUSIVAMENTE el contenido de:
> - `src/app/features/layout/main-layout/main-layout.component.ts`
> - `src/app/features/layout/main-layout/main-layout.component.html`
> - `src/app/features/layout/main-layout/main-layout.component.scss`
>
> con:
> - Componente standalone.
> - Topbar con:
>   - Nombre del sistema.
>   - Usuario actual (placeholder usando `AuthService.getCurrentUser()`).
>   - Select de tema (claro/oscuro) usando `ThemeService`.
>   - Select de idioma (es/en) usando `TranslationService`.
> - Sidebar con un menú estático inicial (`Dashboard`, `Productos`, `POS`) que a futuro será dinámico con `ModuleMenuService`.
> - `<router-outlet>` en la zona de contenido.
> - Uso de componentes PrimeNG (`p-toolbar`, `p-button`, `p-panel`, `p-menu` o similar).

---

### 6. Routing principal

**Archivo**: `src/app/app.routes.ts`

Prompt sugerido:

> Genera EXCLUSIVAMENTE el contenido de `src/app/app.routes.ts` con:
> - Ruta `/login` → `LoginPageComponent` (componente standalone, **sin lazy loading**).
> - Ruta `/register` → `RegisterPageComponent` (si existe en el proyecto; también **sin lazy loading**).
> - Ruta `/setup/initial` → `InitialSetupPageComponent` (wizard de configuración inicial, **sin lazy loading**).
> - Ruta `/Organizations/select` → `OrganizationselectPageComponent` (lazy, usando `loadComponent` o `loadChildren` según la estructura de módulos).
> - Ruta raíz `/` → `MainLayoutComponent` protegida con `AuthGuard`, con children:
>   - `/dashboard` → `DashboardPageComponent` (lazy, placeholder).
>   - Rutas futuras como `/products`, `/inventory`, `/pos`, etc., preparadas para ser cargadas como módulos lazy (`loadChildren`).
> - Compatible con Angular 20, componentes standalone y routing basado en SPA (sin SSR).

---

### 7. Páginas de auth y Organization

**LoginPageComponent**:

- Archivos:
  - `src/app/features/auth/login-page/login-page.component.ts`
  - `src/app/features/auth/login-page/login-page.component.html`
  - `src/app/features/auth/login-page/login-page.component.scss`

Prompt sugerido:

> Genera EXCLUSIVAMENTE el contenido de los archivos de `LoginPageComponent` con:
> - Componente standalone.
> - Formulario reactivo con `email` y `password`.
> - Uso de `AuthService.login` al hacer submit.
> - Uso de PrimeNG (`p-card`, `p-inputText`, `p-password`, `p-button`).

**OrganizationselectPageComponent** (requiere endpoint futuro):

- Archivos:
  - `src/app/features/Organizations/Organization-select-page/Organization-select-page.component.ts`
  - `src/app/features/Organizations/Organization-select-page/Organization-select-page.component.html`
  - `src/app/features/Organizations/Organization-select-page/Organization-select-page.component.scss`

Prompt sugerido:

> Genera EXCLUSIVAMENTE el contenido de los archivos de `OrganizationselectPageComponent` con:
> - Componente standalone.
> - Intento de carga de Organizations desde `OrganizationsApiService.listMyOrganizations()`.
> - Mientras `GET /api/Organizations` no exista en el backend, deja un comentario TODO indicando que la respuesta está simulada.
> - UI con PrimeNG (`p-card`, `p-table` o `p-select`) para seleccionar Organization.
> - Al seleccionar Organization, navegar a `/dashboard`.

Con esto, Sprint 0 deja listo:

- Login funcional contra el backend.
- Layout principal.
- Infraestructura para Organizations (lista pendiente del endpoint real).
