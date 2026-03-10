# Module Decoupling Report (Frontend)

Scope: `angular/src/app/features/pos`

## Acoplamientos corregidos
1. **POS -> Prepaid (frontend)**
   - Ahora el POS consulta la disponibilidad del modulo `prepaid` antes de cargar configuraciones o abrir dialogos.
   - Si `prepaid` no esta instalado, la UI de recargas permanece oculta y no se ejecutan llamadas HTTP.

2. **POS -> Price Lists (frontend)**
   - Se valida la disponibilidad del modulo `price-lists` antes de cargar listas.
   - Si no esta instalado, se oculta el selector y no se aplican resoluciones de precios por lista.

## Cambios tecnicos
1. `angular/src/app/features/pos/pages/pos-terminal-page/pos-terminal-page.component.ts`
   - Nueva verificacion de disponibilidad con `OrganizationsService.getModulesOverview`.
   - Flags `prepaidEnabled` y `priceListsEnabled` gobiernan las llamadas y UI.
2. `angular/src/app/features/pos/pages/pos-terminal-page/pos-terminal-page.component.html`
   - Selector de lista de precios y dialogo de recargas condicionados por disponibilidad.

## Estrategia aplicada
- **Checks de disponibilidad del modulo** en runtime.
- **UI degradable** sin romper la pantalla principal del POS.
