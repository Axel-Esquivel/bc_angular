# Integración de accesos en menú de Configuración

Fecha: 2026-03-13

## Archivo de menú actualizado
- `angular/src/app/core/layout/module-menu.service.ts`

## Nuevas opciones visibles
- **Organización**
  - **Miembros de la organización** → `/app/settings/members`
- **POS**
  - **Configuración POS** → `/app/pos/configs`

## Condiciones de visibilidad
- **Miembros de la organización**:
  - Visible si el usuario tiene `users.read` o `users.write` (o comodines `*`, `users.*`).
- **Configuración POS**:
  - Visible si el usuario tiene `pos.configure` (o comodín `*`).

## Opciones no agregadas
No se añadieron enlaces a **Roles**, **Permisos** o **Solicitudes de ingreso** porque no existen rutas dedicadas para esas pantallas en el frontend actual. La gestión de pendientes está integrada en la pantalla de miembros.

## Confirmación de navegación
Las rutas enlazadas existen y cargan la pantalla correspondiente.
