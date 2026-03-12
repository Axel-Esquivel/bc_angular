# POS Session Report (Frontend)

Fecha: 2026-03-12

## Alcance
- Apertura, consulta y cierre de sesión POS ligada a `PosConfig`.
- Estado de sesión visible con POS y almacén.

## Flujo UI
- Selección de POS antes de abrir sesión.
- Apertura con monto inicial (si el POS lo requiere).
- Indicador de sesión activa con fecha y monto.
- Botón de cierre habilitado solo si hay sesión activa.

## Integración con POS Config
- Se carga `GET /pos/configs/available/me`.
- Se requiere `posConfigId` para abrir y cerrar sesión.
- El almacén se deriva del POS configurado.

## Endpoints usados
- `POST /pos/sessions/open`
- `GET /pos/sessions/active`
- `POST /pos/sessions/close`

## Pendientes
- Arqueo detallado de caja.
- Reporte de movimientos por sesión.
