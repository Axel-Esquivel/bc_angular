# POS Session Report (Frontend)

Fecha: 2026-03-11

## Alcance
- Apertura, consulta y cierre de sesión POS desde la UI.
- Estado de sesión visible con almacén y monto de apertura.

## Flujo UI
- Selección de almacén antes de abrir sesión.
- Apertura con monto inicial.
- Indicador de sesión activa con fecha y monto.
- Botón de cierre habilitado solo si hay sesión activa.

## Endpoints usados
- `POST /pos/sessions/open`
- `GET /pos/sessions/active`
- `POST /pos/sessions/close`

## Pendientes
- Arqueo detallado de caja.
- Reporte de movimientos por sesión.
