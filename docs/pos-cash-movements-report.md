# POS Movimientos de caja (Frontend)

Fecha: 2026-03-12

## Objetivo
Permitir registrar ingresos/egresos de caja durante la sesión POS y mostrarlos en el terminal.

## UI
- Card "Movimientos" en el terminal POS con listado.
- Diálogo para registrar movimiento con tipo, monto, motivo y observaciones.

## Endpoints usados
- `POST /pos/sessions/:id/movements`
- `GET /pos/sessions/:id/movements`
- `GET /pos/sessions/:id/summary` (incluye total de movimientos)

## Notas
- Los movimientos impactan el efectivo esperado al cierre.
- Para ajustes se permite monto negativo.
