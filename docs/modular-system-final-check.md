# Modular System Final Check (Frontend)

Scope: `angular/src/app`

## Estado general
- Rutas base: OK (`auth`, `context`, `setup`, `app`).
- Placeholder generico de modulos: activo para modulos sin pagina real.
- Degradacion opcional: POS valida disponibilidad de `prepaid` y `price-lists` antes de usar servicios/UI.

## Modulos correctos
- `auth`, `context`, `setup`, `app`, `pos`, `products`, `providers`, `purchases`, `prepaid`, `price-lists`, `settings`, `inventory`, `warehouses`.

## Modulos aún inconsistentes
- `companies`: feature sin rutas registradas.
- `reports`: feature sin rutas registradas.

## Deuda tecnica pendiente
- Existen imports cross-feature (p.ej. `pos` -> `price-lists`, `purchases` -> `providers/warehouses`).
- Placeholder generico cubre rutas sin implementacion; requiere plan de reemplazo por paginas reales.

## Riesgos actuales
- Si se desinstala `price-lists`, POS oculta selector y evita llamadas, pero los productos siguen usando precio base; revisar UX.

## Siguiente fase recomendada
1. Decidir si `companies` y `reports` se activan o se retiran formalmente.
2. Reducir imports cross-feature mediante contratos/shared services.
