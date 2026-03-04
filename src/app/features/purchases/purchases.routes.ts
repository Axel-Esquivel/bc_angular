import { Routes } from '@angular/router';

import { SupplierCatalogPageComponent } from './pages/supplier-catalog-page/supplier-catalog-page.component';
import { PurchaseOrderCreatePageComponent } from './pages/purchase-order-create-page/purchase-order-create-page.component';
import { PurchaseOrdersListPageComponent } from './pages/purchase-orders-list-page/purchase-orders-list-page.component';
import { PurchaseReceiptPageComponent } from './pages/purchase-receipt-page/purchase-receipt-page.component';

export const purchasesRoutes: Routes = [
  {
    path: 'orders',
    component: PurchaseOrdersListPageComponent,
  },
  {
    path: 'orders/new',
    component: PurchaseOrderCreatePageComponent,
  },
  {
    path: 'supplier-catalog',
    component: SupplierCatalogPageComponent,
  },
  {
    path: 'receipts',
    component: PurchaseReceiptPageComponent,
  },
  {
    path: 'receipts/new/:purchaseOrderId',
    component: PurchaseReceiptPageComponent,
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'orders',
  },
];
