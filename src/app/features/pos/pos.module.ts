import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';

import { CartLinesPanelComponent } from './components/cart-lines-panel/cart-lines-panel.component';
import { ProductSelectorComponent } from './components/product-selector/product-selector.component';
import { TotalsPanelComponent } from './components/totals-panel/totals-panel.component';
import { PosTerminalPageComponent } from './pages/pos-terminal-page/pos-terminal-page.component';
import { posRoutes } from './pos.routes';

@NgModule({
  declarations: [
    PosTerminalPageComponent,
    ProductSelectorComponent,
    CartLinesPanelComponent,
    TotalsPanelComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(posRoutes),
    Button,
    Card,
    Dialog,
    InputNumber,
    InputText,
    Select,
    TableModule,
  ],
})
export class PosModule {}
