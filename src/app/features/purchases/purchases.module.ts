import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';
import { MessageModule } from 'primeng/message';
import { AutoCompleteModule } from 'primeng/autocomplete';
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
    ButtonModule,
    DatePickerModule,
    DialogModule,
    FloatLabelModule,
    InputNumberModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    TableModule,
    ToolbarModule,
    MessageModule,
    AutoCompleteModule,
    AccordionModule,
  ],
})
export class PurchasesModule {}
