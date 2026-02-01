# Cómo pedir archivos al agente (Frontend Angular)

Esta guía te ayuda a formular prompts claros y consistentes para que el agente (ChatGPT / Codex) genere archivos del frontend `bc_angular` que encajen con el backend `bc_server`.

---

## Patrón general de prompt

Para cada archivo:

> Genera EXCLUSIVAMENTE el contenido de `RUTA/DEL/ARCHIVO.ext` para el frontend Angular, con:
> - [Breve descripción de lo que debe hacer]
> - [Dependencias importantes: servicios, modelos, PrimeNG, etc.]
> - Debe compilar con Angular 20 (SPA, sin SSR) y TypeScript estricto.

### Ejemplo concreto

> Genera EXCLUSIVAMENTE el contenido de `src/app/core/api/auth-api.service.ts` con:
> - Métodos `login`, `register`, `refresh`, `me` contra `/api/auth/*`.
> - Uso de `HttpClient` y `APP_CONFIG` para `apiBaseUrl`.
> - Tipos de retorno `Observable<ApiResponse<T>>`.
> - Tipo `ApiResponse<T>` importado desde `src/app/shared/models/api-response.model.ts`.

---

## Reglas prácticas

1. **Pedir un solo archivo por mensaje**  
   Esto facilita que el agente genere un código limpio y enfocado.

2. **Mencionar las dependencias explícitamente**  
   Siempre que sea posible, indicar:

   - Services que debe usar (`AuthApiService`, `OrganizationsApiService`, etc.).
   - Tipos a importar (`ApiResponse`, `AppConfig`, etc.).
   - Componentes de PrimeNG que debe utilizar.

3. **Respetar la estructura y nombres existentes**  
   Si el archivo ya existe:
   - Especificar si se desea **reemplazarlo por completo** o **ajustarlo**.
   - Lo más simple es siempre reemplazar por completo, copiando/pegando el archivo generado.

4. **Incluir el mensaje de error cuando algo falla**  
   Si aparece un error de compilación o de runtime:

   - Copiar el error exacto en el prompt.
   - Aclarar que se quiere corregir el archivo manteniendo las firmas públicas.

   Ejemplo:
   > Corrige EXCLUSIVAMENTE el contenido de `src/app/core/api/auth-api.service.ts`.  
   > Error actual: `TS2345: Argument of type ...`.  
   > Mantén los métodos `login`, `register`, `refresh`, `me` con las mismas firmas públicas y sigue usando `APP_CONFIG`.

5. **Diferenciar entre endpoints existentes y futuros**  
   Si en el prompt se usan endpoints de diseño futuro (por ejemplo `/api/system/status`), es buena idea aclarar:

   > Este endpoint aún no existe en el backend; genera el servicio/preparación en el frontend y deja un comentario TODO indicando que requiere implementación en `bc_server`.

---

## Uso por sprints

- Para el arranque, usar `docs/09_SPRINT0_SHELL_AUTH_Organization.md` como guía de orden de archivos.
- Posteriormente, usar `docs/10_TASKS_FRONTEND.md` para ir agregando módulos:
  - Productos
  - Inventario
  - POS
  - Compras
  - Reportes
  - Seguridad, etc.

---

## Lista de prompts listos

El archivo `frontend_codex_prompts.txt` contiene una colección de prompts **ya redactados** listos para copiar y pegar, organizados por:

- Configuración base (`AppConfig`, `ApiResponse`).
- Auth (`AuthApiService`, `AuthService`, `TokenStorageService`, `AuthGuard`, `AuthInterceptor`).
- Layout (`MainLayoutComponent`, `app.routes.ts`).
- Organizations.
- Productos y POS.
- Módulos dinámicos (`ModulesApiService`, `ModuleMenuService`).
- Setup inicial (`SystemStatusApiService`, `InitialSetupApiService`, `InitialSetupPageComponent`) marcados como funcionalidad futura.
