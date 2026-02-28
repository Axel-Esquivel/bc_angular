import { Routes } from '@angular/router';

import { SupplierCatalogPageComponent } from './pages/supplier-catalog-page/supplier-catalog-page.component';
import { PurchaseOrderCreatePageComponent } from './pages/purchase-order-create-page/purchase-order-create-page.component';

export const purchasesRoutes: Routes = [
  {
    path: 'orders/new',
    component: PurchaseOrderCreatePageComponent,
  },
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
