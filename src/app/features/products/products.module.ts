import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AccordionModule } from 'primeng/accordion';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { Message } from 'primeng/message';
import { Textarea } from 'primeng/textarea';

import { ProductFormComponent } from './components/product-form/product-form.component';
import { ProductFormPageComponent } from './pages/product-form-page/product-form-page.component';
import { ProductsListPageComponent } from './pages/products-list-page/products-list-page.component';
import { productsRoutes } from './products.routes';

@NgModule({
  declarations: [ProductsListPageComponent, ProductFormPageComponent, ProductFormComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(productsRoutes),
    AccordionModule,
    Button,
    Card,
    Dialog,
    InputNumber,
    InputText,
    Select,
    TableModule,
    ToggleSwitchModule,
    Message,
    Textarea,
  ],
})
export class ProductsModule {}
