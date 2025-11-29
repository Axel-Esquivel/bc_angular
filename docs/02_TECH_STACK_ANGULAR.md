# Tech Stack – Frontend Angular

## Angular – SPA (sin SSR)

- Framework: **Angular 20**.
- Componentes standalone (sin NgModules siempre que sea posible).
- Aplicación **SPA** (Single Page Application) sin SSR ni server-side rendering.
- Entrada principal: `src/main.ts` y configuración de build en `angular.json`.

> Regla: el agente NO debe generar ni depender de archivos de SSR (`main.server.ts`, `server.ts`, `app.config.server.ts`). Toda la aplicación se sirve como SPA clásica en el navegador.

---

## Dependencias principales de Angular

- `@angular/core`
- `@angular/common`
- `@angular/router`
- `@angular/platform-browser`
- `@angular/platform-browser-dynamic`
- `@angular/platform-server`
- `@angular/animations` (necesario para PrimeNG)

### HTTP y RxJS

- `@angular/common/http` (HttpClient).
- `rxjs` para flujos y operadores.

Uso recomendado:

- Todos los servicios de API deben retornar `Observable<T>`.
- Usar `pipe`, `map`, `tap`, `catchError`, etc. donde corresponda.

---

## PrimeNG 20 y temas

- `primeng` **20.x**
- `@primeng/themes` **20.x**
- `primeicons` (opcional para iconos)

Convenciones:

- Botones: `<p-button>` (NO usar `pButton` como atributo).
- Selectores: `<p-select>` (NO usar `<p-dropdown>`).
- Tablas: `<p-table>`.
- Formularios: `p-inputText`, `p-password`, `p-inputNumber`, `p-calendar`, etc.
- Layout: `p-toolbar`, `p-panel`, `p-card`, `p-dialog`.

Temas:

- Utilizar temas de `@primeng/themes`, por ejemplo:
  - `lara-light-blue`
  - `lara-dark-blue`
- Crear un `ThemeService` para cambiar dinámicamente de tema y persistir la elección del usuario (por ejemplo en `localStorage`).

---

## I18n (Internacionalización)

Requisitos:

- Idioma por defecto: **español (`es`)**.
- Idioma secundario: **inglés (`en`)**.

Implementación ligera sugerida:

- Servicio `TranslationService` en `core/i18n/translation.service.ts` que:
  - Mantenga el idioma actual.
  - Cargue diccionarios simples desde `translations.es.ts` y `translations.en.ts`.
  - Exponga `translate(key: string): string`.
- Pipe `TranslatePipe` en `shared/pipes/translate.pipe.ts` para usar en templates:

```html
<span>{{ 'auth.login.title' | translate }}</span>
```

A futuro, si se desea, se puede reemplazar por `@ngx-translate/core` o el sistema i18n nativo de Angular, pero para iniciar es suficiente con una implementación manual.

---

## Seguridad en el frontend

- NO guardar contraseñas en ningún tipo de almacenamiento.
- Manejar JWT vía `TokenStorageService`:
  - Guardar el token de acceso en `localStorage` o `sessionStorage`.
  - Limpieza completa en logout.
- `AuthInterceptor` debe:
  - Leer el token actual.
  - Agregar `Authorization: Bearer <token>` a peticiones cuyo destino sea `APP_CONFIG.apiBaseUrl`.

---

## Integración con el backend (`bc_server`)

Config central recomendada: `AppConfig` (ver `docs/06_ENVIRONMENT.md`).

Campos mínimos:

- `apiBaseUrl` → normalmente `http://localhost:3000/api` en desarrollo.
- `socketUrl` → normalmente `http://localhost:3000` en desarrollo.

Todos los servicios de API deben inyectar `APP_CONFIG` y construir sus URLs como:

```ts
`${config.apiBaseUrl}/auth/login`
```

Nunca hardcodear `http://localhost:3000/api` directamente en los servicios o componentes.

---

## Sockets (tiempo real)

En el backend existe carpeta `src/realtime` con adaptador `SocketsAdapter`. El frontend debe usar `socket.io-client` para conectar:

- URL: `socketUrl` desde `AppConfig` (ej. `http://localhost:3000`).
- Servicio sugerido: `core/realtime/socket.service.ts` con métodos:
  - `connect()`
  - `disconnect()`
  - `on<T>(eventName: string)`
  - `emit(eventName: string, payload?: any)`

Esto permitirá implementar posteriormente chat y notificaciones en tiempo real.
