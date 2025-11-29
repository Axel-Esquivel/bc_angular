# Local Setup – Frontend Angular

Guía para levantar el frontend `bc_angular` en entorno de desarrollo, conectado al backend `bc_server`.

---

## Requisitos

- Node.js 20.x
- npm 10.x (o compatible)
- Backend `bc_server` corriendo en `http://localhost:3000`

---

## Pasos iniciales

1. Clonar el repositorio frontend:

   ```bash
   git clone https://github.com/Axel-Esquivel/bc_angular.git
   cd bc_angular
   ```

2. Instalar dependencias:

   ```bash
   npm install
   ```

3. Crear o revisar la configuración de entorno (ver `docs/06_ENVIRONMENT.md`).

4. Asegurarse de tener el backend `bc_server` corriendo.  
   En el backend, la API se expone con prefijo `/api`, por lo que la URL en desarrollo suele ser:

   ```txt
   http://localhost:3000/api
   ```

5. Levantar el frontend en modo desarrollo:

   ```bash
   npm start
   ```

   Por defecto, Angular servirá la app en:

   ```txt
   http://localhost:4200/
   ```

---

## Build

### Build de producción (SPA)

El proyecto se compila como **SPA** estándar de Angular (sin SSR).

1. Build de desarrollo:

   ```bash
   npm run build:dev
   ```

   (o el script equivalente definido en `package.json`).

2. Build de producción:

   ```bash
   npm run build
   ```

   Esto generará la carpeta `dist/` con la aplicación Angular lista para ser servida por Nginx u otro servidor de archivos estáticos.

> Regla para el agente: no introducir configuración de SSR ni depender de archivos `main.server.ts`, `server.ts` o `app.config.server.ts`. Todo el flujo debe asumir que la app corre como SPA en el navegador.

---


## Conexión con el backend

La URL de la API y de sockets deben obtenerse desde una configuración central (`AppConfig` o `environment`).  
Ejemplo para desarrollo:

- `apiBaseUrl: 'http://localhost:3000/api'`
- `socketUrl: 'http://localhost:3000'`

Nunca hardcodear estas URLs directamente en componentes o servicios; usar siempre la configuración inyectada.

---

## Scripts útiles

Revisar `package.json` real, pero típicamente:

- `npm start` → `ng serve` en modo desarrollo.
- `npm run build` → build de producción.
- `npm test` → pruebas unitarias.

Si en algún momento el build falla por falta de internet (descarga de dependencias, etc.), revisar la conectividad antes de asumir errores de código.
