# Acceso visible a miembros de organización

Fecha: 2026-03-13

## Ubicación integrada
Se agregó el acceso en el menú lateral dinámico (Configuración) del App Shell.

## Archivo modificado
- `angular/src/app/core/layout/module-menu.service.ts`

## Ruta final enlazada
- `/app/settings/members`

## Condición de visibilidad
- Se muestra solo si el usuario tiene permisos:
  - `users.read` o `users.write`
  - También se muestra si el usuario tiene `*` o `users.*`.

## Cambios visuales
- Nuevo ítem de menú: **“Miembros de organización”** dentro del bloque **“Configuración”**.
- No se duplicaron rutas ni se alteró el dashboard principal.
