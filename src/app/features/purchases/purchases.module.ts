import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { FloatLabel } from 'primeng/floatlabel';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Toolbar } from 'primeng/toolbar';
import { Message } from 'primeng/message';
import { AutoComplete } from 'primeng/autocomplete';
import { AccordionModule } from 'primeng/accordion';

import { AddOrderProductDialogComponent } from './components/add-order-product-dialog/add-order-product-dialog.component';
import { SupplierCatalogFormComponent } from './components/supplier-catalog-form/supplier-catalog-form.component';
import { PurchaseOrderLinesComponent } from './components/purchase-order-lines/purchase-order-lines.component';
import { SupplierCatalogAssignComponent } from './components/supplier-catalog-assign/supplier-catalog-assign.component';
import { SupplierCatalogPageComponent } from './pages/supplier-catalog-page/supplier-catalog-page.component';
import { PurchaseOrderCreatePageComponent } from './pages/purchase-order-create-page/purchase-order-create-page.component';
import { PurchaseOrdersListPageComponent } from './pages/purchase-orders-list-page/purchase-orders-list-page.component';
import { purchasesRoutes } from './purchases.routes';

@NgModule({
  declarations: [
    SupplierCatalogPageComponent,
    SupplierCatalogFormComponent,
    PurchaseOrderCreatePageComponent,
    PurchaseOrderLinesComponent,
    AddOrderProductDialogComponent,
    SupplierCatalogAssignComponent,
    PurchaseOrdersListPageComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(purchasesRoutes),
    Button,
    DatePicker,
    Dialog,
    FloatLabel,
    InputNumber,
    InputText,
    Select,
    TableModule,
    Toolbar,
    Message,
    AutoComplete,
    AccordionModule,
  ],
})
export class PurchasesModule {}
