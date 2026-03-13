# Roles y permisos de miembros (Frontend)

Fecha: 2026-03-13

## Resumen
Se complementó la UI de miembros para mostrar rol y permisos del rol asignado, reutilizando la estructura actual de organización. El frontend obtiene roles desde la organización y muestra permisos relevantes en el diálogo de cambio de rol.

## Archivos modificados
- `angular/src/app/features/settings/pages/organization-members-page/organization-members-page.component.ts`
- `angular/src/app/features/settings/pages/organization-members-page/organization-members-page.component.html`
- `angular/src/app/shared/models/organization.model.ts`
- `angular/src/app/core/api/organizations-api.service.ts`

## Funcionalidad visible
- Mostrar rol actual del miembro.
- Mostrar permisos del rol seleccionado en el diálogo de edición.
- Acciones de administración habilitadas/ocultas según permisos del usuario actual (`users.read`, `users.write`).

## Endpoints usados
- `GET /organizations/:id` (roles y membresía actual)
- `GET /organizations/:id/members`
- `PATCH /organizations/:id/members/:userId/role`
- `PATCH /organizations/:id/members/:userId/access`
- `POST /organizations/:id/members/:userId/accept`
- `POST /organizations/:id/members/:userId/reject`
- `DELETE /organizations/:id/members/:userId`

## Notas
- Los permisos efectivos del usuario se infieren desde la organización activa (`roles` y `members`).
- No se creó un sistema paralelo de permisos.

