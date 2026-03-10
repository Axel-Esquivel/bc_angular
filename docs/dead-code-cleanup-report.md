# Dead Code Cleanup Report (Angular)

Scope: `angular/src/app`

## Hallazgos y acciones
| Archivo | Tipo | Motivo | Accion | Riesgo |
| --- | --- | --- | --- | --- |
| `src/app/features/companies/pages/branches-page/*` | pagina + modulo | No esta referenciado por rutas ni imports externos. | eliminado | Bajo: no habia referencias. |
| `src/app/features/companies/pages/warehouses-page/*` | pagina + modulo | No esta referenciado por rutas ni imports externos. | eliminado | Bajo: no habia referencias. |
| `src/app/features/reports/*` | feature | No aparece en rutas de `app.routes.ts`/`features/app/app.routes.ts`. | documentado | Medio: puede estar planeado, se conserva. |
| `src/app/features/companies/*` | feature | No aparece en rutas globales; solo se usa via servicios API en otros features. | documentado | Medio: podria activarse mas adelante. |

## Notas
- Se eliminaron solo paginas sin ruta ni imports externos.
- No se removieron servicios API ni componentes con uso indirecto.
