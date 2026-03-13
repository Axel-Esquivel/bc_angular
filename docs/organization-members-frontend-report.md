# Frontend – Administración de miembros de organización

Fecha: 2026-03-13

## Resumen
Se implementó la pantalla de administración de miembros dentro del módulo de Settings, reutilizando `OrganizationsService` y los modelos existentes. La UI permite listar miembros, ver pendientes, aprobar/rechazar, cambiar rol, activar/desactivar acceso y eliminar miembros, respetando permisos del usuario actual.

## Archivos creados
- `angular/src/app/features/settings/pages/organization-members-page/organization-members-page.component.ts`
- `angular/src/app/features/settings/pages/organization-members-page/organization-members-page.component.html`
- `angular/src/app/features/settings/pages/organization-members-page/organization-members-page.component.scss`

## Archivos modificados
- `angular/src/app/core/api/organizations-api.service.ts`
- `angular/src/app/shared/models/organization.model.ts`
- `angular/src/app/features/settings/settings.module.ts`
- `angular/src/app/features/settings/settings.routes.ts`

## Ruta final
- `/app/settings/members`

## Servicios usados
- `OrganizationsService` (core/api)
- `ActiveContextStateService`
- `AuthService`

## Endpoints consumidos
- `GET /organizations/:id` (roles y membresía actual)
- `GET /organizations/:id/members`
- `PATCH /organizations/:id/members/:userId/role`
- `PATCH /organizations/:id/members/:userId/access`
- `POST /organizations/:id/members/:userId/accept`
- `POST /organizations/:id/members/:userId/reject`
- `DELETE /organizations/:id/members/:userId`

## Acciones disponibles en UI
- Ver miembros activos/deshabilitados.
- Ver solicitudes pendientes.
- Aprobar o rechazar solicitudes.
- Cambiar rol.
- Activar/desactivar acceso.
- Eliminar miembro.

## Permisos considerados
- `users.read`: habilita la visualización de miembros.
- `users.write`: habilita acciones administrativas.

## Notas
- La UI no muestra IDs crudos; prioriza nombre y correo.
- El tema visual se mantiene consistente con el resto de Settings.
