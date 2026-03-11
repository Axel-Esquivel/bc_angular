# POS Optional Integrations (Frontend)

Fecha: 2026-03-10

## Dependencias obligatorias del POS
- `POS` endpoints (`/api/pos/*`)
- `inventory` stock (`/api/inventory/stock`)
- `warehouses` (`/api/warehouses`)
- contexto activo y auth

## Integraciones opcionales evaluadas
- **price-lists**
  - No se consume en la UI base.
  - POS opera con precio base de la variante.
- **prepaid**
  - No hay UI ni consumo en POS base.
  - Los metodos de pago se mantienen en `CASH` hasta habilitar integraciones reales.
- **customers**
  - No hay selector en POS base.
- **promotions**
  - No hay UI ni consumo; descuentos quedan en `0`.
- **accounting**
  - No hay integracion directa en frontend.

## Degradacion segura
- El POS base funciona sin modulos opcionales.
- Si se agregan en el futuro, deben habilitarse solo cuando el modulo este instalado.
