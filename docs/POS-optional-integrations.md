# POS Optional Integrations (Frontend)

Fecha: 2026-03-10

**Objetivo**
Documentar integraciones opcionales en el POS y el comportamiento seguro cuando no estÃ¡n disponibles.

## Dependencias obligatorias del POS (Frontend)
- POS base consume:
  - `POS` endpoints (`/api/pos/*`)
  - `inventory` stock (`/api/inventory/stock`)
  - `warehouses` (`/api/warehouses`)
  - contexto activo y auth

## Integraciones opcionales y comportamiento
- **prepaid**
  - No se consume desde el POS base actual.
  - Si se agrega en el futuro, debe verificarse disponibilidad del mÃ³dulo antes de mostrar UI.

- **price-lists**
  - No se consume desde el POS base actual.
  - El POS usa precio base de la variante.

- **customers**
  - No se requiere para operar el POS base.
  - Si se agrega selecciÃ³n de cliente, debe ser opcional.

- **promotions**
  - No se consume desde el POS base actual.
  - Cualquier promociÃ³n futura debe degradar con fallback al precio base.

- **accounting**
  - No hay integraciÃ³n directa desde frontend.
  - Se delega a eventos backend (outbox).

## Notas
- El POS base estÃ¡ diseÃ±ado para no fallar si un mÃ³dulo opcional no estÃ¡ instalado.
