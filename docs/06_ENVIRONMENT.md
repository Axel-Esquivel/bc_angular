# Configuración de entorno – Frontend

El frontend necesita ciertos parámetros de configuración para conectarse correctamente al backend y definir idioma/tema por defecto.

---

## AppConfig sugerido

Archivo sugerido: `src/app/core/config/app-config.ts`.

```ts
import { InjectionToken } from '@angular/core';

export interface AppConfig {
  apiBaseUrl: string;
  socketUrl: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  defaultTheme: string;
  availableThemes: string[];
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

export const APP_CONFIG_VALUE: AppConfig = {
  apiBaseUrl: 'http://localhost:3000/api',
  socketUrl: 'http://localhost:3000',
  defaultLanguage: 'es',
  supportedLanguages: ['es', 'en'],
  defaultTheme: 'lara-light-blue',
  availableThemes: ['lara-light-blue', 'lara-dark-blue'],
};
```

Luego, en `app.config.ts` se debe registrar:

```ts
import { ApplicationConfig } from '@angular/core';
import { APP_CONFIG, APP_CONFIG_VALUE } from './core/config/app-config';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: APP_CONFIG, useValue: APP_CONFIG_VALUE },
    // otros providers...
  ],
};
```

---

## environments (opcional)

Si se usan `environment.ts` y `environment.development.ts`, se puede delegar a ellos:

```ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api',
  socketUrl: 'http://localhost:3000',
};
```

Y en `AppConfig` leer de `environment` en vez de valores fijos.

---

## Producción

En producción, `apiBaseUrl` y `socketUrl` deben apuntar al dominio real del backend, por ejemplo:

- `apiBaseUrl: 'https://api.mi-dominio.com/api'`
- `socketUrl: 'https://api.mi-dominio.com'`

Se recomienda manejar estas URLs mediante:

- `environment.prod.ts`, o
- Variables de entorno inyectadas en tiempo de build/arranque (según la estrategia de despliegue).

---

## Reglas para el agente

- Nunca hardcodear URLs como `http://localhost:3000/api` dentro de servicios o componentes.
- Siempre inyectar `AppConfig` o leer `environment`.
- No exponer secretos sensibles en el frontend (API keys privadas, etc.).
