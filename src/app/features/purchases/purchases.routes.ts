import { Routes } from '@angular/router';

import { SupplierCatalogPageComponent } from './pages/supplier-catalog-page/supplier-catalog-page.component';

export const purchasesRoutes: Routes = [
  {
    path: 'supplier-catalog',
    component: SupplierCatalogPageComponent,
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'supplier-catalog',
  },
];
