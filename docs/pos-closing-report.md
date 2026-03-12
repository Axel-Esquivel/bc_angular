# POS Cierre por denominaciones (Frontend)

Fecha: 2026-03-12

## Objetivo
Permitir captura del cierre de caja por denominaciones y mostrar diferencia contra el esperado.

## UI
- Diálogo de cierre con resumen de sesión.
- Tabla de denominaciones con cantidades y subtotales.
- Total contado y diferencia calculada en tiempo real.
- Observación obligatoria si hay diferencia.

## Endpoints usados
- `GET /pos/sessions/:id/summary`
- `POST /pos/sessions/close`

## Pendientes
- Integrar movimientos de caja si se implementan.
