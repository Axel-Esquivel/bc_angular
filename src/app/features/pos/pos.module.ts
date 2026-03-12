import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Checkbox } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Textarea } from 'primeng/textarea';

import { posRoutes } from './pos.routes';
import { PosTerminalPageComponent } from './pages/pos-terminal-page/pos-terminal-page.component';
import { PosConfigsPageComponent } from './pages/pos-configs-page/pos-configs-page.component';
import { PosProductSelectorComponent } from './components/product-selector/pos-product-selector.component';
import { PosCartLinesComponent } from './components/cart-lines/pos-cart-lines.component';
import { PosTotalsPanelComponent } from './components/totals-panel/pos-totals-panel.component';
import { PosSessionControlsComponent } from './components/session-controls/pos-session-controls.component';

@NgModule({
  declarations: [
    PosTerminalPageComponent,
    PosConfigsPageComponent,
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
    Checkbox,
    DividerModule,
    Dialog,
    InputNumber,
    InputText,
    MultiSelect,
    Select,
    TableModule,
    Textarea,
    Toast,
  ],
})
export class PosModule {}
