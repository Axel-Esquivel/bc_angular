import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { posRoutes } from './pos.routes';
import { PosTerminalPageComponent } from './pages/pos-terminal-page/pos-terminal-page.component';
import { PosProductSelectorComponent } from './components/product-selector/pos-product-selector.component';
import { PosCartLinesComponent } from './components/cart-lines/pos-cart-lines.component';
import { PosTotalsPanelComponent } from './components/totals-panel/pos-totals-panel.component';
import { PosSessionControlsComponent } from './components/session-controls/pos-session-controls.component';

@NgModule({
  declarations: [
    PosTerminalPageComponent,
    PosProductSelectorComponent,
    PosCartLinesComponent,
    PosTotalsPanelComponent,
    PosSessionControlsComponent,
  ],
  providers: [MessageService],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(posRoutes),
    Button,
    Card,
    DividerModule,
    InputNumber,
    InputText,
    Select,
    TableModule,
    Toast,
  ],
})
export class PosModule {}
