import { Routes } from '@angular/router';

import { PriceListsPageComponent } from './pages/price-lists-page/price-lists-page.component';
import { PriceListFormPageComponent } from './pages/price-list-form-page/price-list-form-page.component';

export const priceListsRoutes: Routes = [
  { path: '', component: PriceListsPageComponent },
  { path: 'new', component: PriceListFormPageComponent },
  { path: ':id/edit', component: PriceListFormPageComponent },
];

