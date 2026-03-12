# POS Apertura por denominaciones (Frontend)

Fecha: 2026-03-12

## Objetivo
Permitir capturar la apertura de caja por denominaciones y calcular el total automáticamente.

## UI
- Se muestra un formulario de denominaciones en la sección de sesión POS.
- Cada fila permite ingresar cantidad y muestra subtotal.
- El total de apertura se calcula automáticamente.

## Datos enviados
- `openingDenominations` en `POST /pos/sessions/open`.
- `openingAmount` se deriva del total calculado.

## Denominaciones base
Si no existe catálogo, se usa una lista inicial por moneda:
- `GTQ`, `USD`, `MXN`, `EUR`.
- Si la moneda no coincide, se usa una lista genérica.

## Pendientes
- Ajustar denominaciones desde catálogo real si se agrega más adelante.
- Integrar cierre por denominaciones.
