import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';

import { posRoutes } from './pos.routes';
import { PosTerminalPageComponent } from './pages/pos-terminal-page/pos-terminal-page.component';
import { ProductSelectorComponent } from './components/product-selector/product-selector.component';
import { CartLinesPanelComponent } from './components/cart-lines-panel/cart-lines-panel.component';
import { TotalsPanelComponent } from './components/totals-panel/totals-panel.component';

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
    ButtonModule,
    CardModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TableModule,
  ],
})
export class PosModule {}
