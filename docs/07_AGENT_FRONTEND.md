# Agent Guide (Codex) – Frontend Angular

Guía específica para que el **agente (ChatGPT / Codex)** genere y modifique archivos del frontend `bc_angular` de forma consistente con el backend `bc_server`.

---

## Objetivo del agente

El agente debe:

- Generar código para **Angular 20 como SPA** (sin SSR), usando componentes standalone.
- Consumir la API real del backend (`bc_server`) usando rutas existentes, y marcar explícitamente cuando use endpoints de diseño futuro.
- Integrar **PrimeNG 20**, i18n simple (es/en), temas, y sockets.
- Respetar la estructura propuesta de `core/`, `shared/` y `features/`.

---

## Reglas de oro

1. **Un archivo por respuesta**  
   Cada vez que se pida un archivo, la respuesta debe contener **exclusivamente** el contenido completo de ese archivo, sin comentarios antes o después.

2. **Código compilable**  
   - Debe compilar con TypeScript estricto y Angular 20.
   - Incluir todos los imports necesarios.
   - Evitar `any` salvo que sea claramente inevitable o transitorio.

3. **SPA (sin SSR)**  
   - No crear ni asumir archivos de SSR (`main.server.ts`, `server.ts`, `app.config.server.ts`).
   - Todo el código debe funcionar correctamente en una aplicación Angular SPA estándar.

4. **No romper contratos públicos**  
   - Evitar cambiar nombres de clases, métodos y firmas públicas ya establecidas.
   - Si se requiere un cambio de firma, explicarlo y hacerlo sólo si el usuario lo autoriza.

5. **Uso correcto de PrimeNG 20**  
   - `<p-button>` en lugar de `pButton` como atributo.
   - `<p-select>` en lugar de `<p-dropdown>`.
   - Respetar la API de PrimeNG 20 para componentes (`[options]`, `[optionLabel]`, etc.).

6. **Servicios de API centralizados**  
   - Ningún componente debe llamar directamente a `HttpClient` con URLs absolutas.
   - Las peticiones van siempre a través de `core/api/*.service.ts`.
   - Los servicios usan `AppConfig` o `environment` para construir URLs.

7. **Integración con backend real**  
   - Para endpoints existentes, usar rutas correctas (`/api/auth/login`, `/api/products`, etc.).
   - Para endpoints futuros (por ejemplo `/api/system/status`), indicar en comentarios que aún **no existen en el backend** y que deben implementarse.

8. **Autenticación y guardas**  
   - `AuthService` debe orquestar login/logout y usuario actual.
   - `TokenStorageService` maneja persistencia del token.
   - `AuthInterceptor` agrega `Authorization: Bearer <token>` a peticiones hacia `apiBaseUrl`.
   - `AuthGuard` controla acceso a rutas protegidas.

9. **Sockets**  
   - `SocketService` debe usar `socket.io-client` y `AppConfig.socketUrl`.
   - Exponer métodos `connect`, `disconnect`, `on`, `emit`.

10. **i18n & temas**  
    - `TranslationService` + `TranslatePipe` para textos.
    - `ThemeService` para cambiar tema, actualizando `<link>` de theme CSS de PrimeNG.

---

## Formato de las respuestas

Cuando el usuario pida:

> Genera EXCLUSIVAMENTE el contenido de `src/app/core/api/auth-api.service.ts` con [requisitos].

La respuesta del agente debe ser **sólo**:

```ts
// contenido del archivo
import { Injectable } from '@angular/core';
// ...
```

Nada de explicaciones fuera del archivo.

---

## Uso de endpoints futuros

En los casos de endpoints de diseño futuro, como:

- `/api/system/status`
- `/api/system/setup`
- `GET /api/Organizations`

El agente debe:

- Comentar claramente en el código que el endpoint aún no existe en `bc_server`.
- Mantener la lógica preparada para conectar cuando el backend implemente dichos endpoints.
