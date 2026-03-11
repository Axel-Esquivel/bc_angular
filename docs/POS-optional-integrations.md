# POS Optional Integrations (Frontend)

Fecha: 2026-03-11

## Integraciones opcionales evaluadas
- **price-lists**
  - Cuando está instalado, el POS resuelve el precio usando `/products/resolve-price`.
  - Si no está instalado, se usa el precio base de la variante.
- **prepaid**
  - Sin integración directa en el POS base.
- **customers**
  - Sin selector ni consumo en el POS base.
- **promotions**
  - Sin integración activa; descuentos quedan en cero.
- **accounting**
  - Sin integración directa en frontend.

## Degradación segura
- El POS base funciona sin módulos opcionales.
- La UI opcional permanece oculta o sin cambios cuando el módulo no está disponible.
