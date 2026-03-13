# Auditoría de administración de usuarios en organización (Frontend)

Fecha: 2026-03-13

## Resumen
El frontend ya cuenta con servicios y modelos para organización, roles y membresías, además de páginas de setup (entrada, creación y unión). No existe todavía una pantalla dedicada a administración de miembros/roles dentro de una organización (settings o administración).

## Servicios existentes
Ubicación: `angular/src/app/core/api/organizations-api.service.ts`

Incluye métodos:
- `list()` → `GET /organizations`
- `listMemberships()` → `GET /organizations/memberships`
- `getById(id)`
- `create(payload)`
- `bootstrap(payload)`
- `addMember(organizationId, { email, role })` → invita por email
- `requestJoin(organizationId, payload)`
- `requestJoinByCode(payload)` → `POST /organizations/join`
- `joinRequest(payload)` → `POST /organizations/join-request`
- `acceptMember(organizationId, userId)`
- `rejectMember(organizationId, userId)`
- `removeMember(organizationId, userId)`
- `updateMemberRole(organizationId, userId, { role })`
- `listRoles(id)`
- `createRole(id, payload)`
- `updateRole(id, roleKey, payload)`
- `deleteRole(id, roleKey)`
- `listPermissions(id)`

## Modelos existentes
Ubicación: `angular/src/app/shared/models/organization.model.ts`
- `IOrganizationMember` (userId, email, roleKey, status, fechas)
- `IOrganizationRole`
- `IOrganizationMembership`
- `IOrganization` con `members` y `roles`

## Páginas y componentes existentes relacionados
Ubicación: `angular/src/app/features/setup/pages`

- `setup-entry-page`
  - Lista organizaciones del usuario, membresías activas y pendientes.
  - Permite crear organización, seleccionar por defecto y salir de una organización.
- `setup-join-page`
  - Permite solicitar acceso por código/nombre (join request).
- `setup-create-page`, `setup-bootstrap-page`
  - Flujos de creación/bootstrapping de organización.

Otros lugares que usan información de organización:
- `context-select-page` (selección de contexto).
- `module-store-page` y `modules-settings-page` (setup y configuración de módulos).

## Qué ya existe y se puede reutilizar
- Servicio completo para miembros, roles y permisos.
- Modelos compartidos para membresías y roles.
- UI básica para solicitar ingreso y listar membresías.

## Qué está incompleto
- No hay UI dedicada para:
  - Invitar miembros desde settings.
  - Administrar roles por organización (crear/editar/borrar).
  - Aprobar/rechazar solicitudes de ingreso desde un panel administrativo.

## Qué no existe
- Módulo/feature específico de administración de miembros y roles en “Settings” o “Organizations”.

## Observaciones de calidad
- En `setup-entry-page` hay textos con encoding corrupto (ej. “Organizaci?n”, “Sesion”), lo que indica archivos con encoding incorrecto. No se corrige en esta fase, pero debe considerarse antes de exponer UI de administración.

## Propuesta breve para nuevo feature (sin implementar aún)
- Feature Angular en `features/settings` o `features/organizations`:
  - Lista de miembros y roles por organización.
  - Invitación por email.
  - Aceptar/rechazar solicitudes.
  - Edición de roles.
- Reutilizar `OrganizationsService` y modelos actuales para evitar duplicación.

