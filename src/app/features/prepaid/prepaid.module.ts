import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Dialog } from 'primeng/dialog';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { Toast } from 'primeng/toast';

import { PrepaidShellComponent } from './pages/prepaid-shell/prepaid-shell.component';
import { PrepaidProvidersPageComponent } from './pages/prepaid-providers-page/prepaid-providers-page.component';
import { PrepaidDepositsPageComponent } from './pages/prepaid-deposits-page/prepaid-deposits-page.component';
import { PrepaidBalancesPageComponent } from './pages/prepaid-balances-page/prepaid-balances-page.component';
import { PrepaidConfigsPageComponent } from './pages/prepaid-configs-page/prepaid-configs-page.component';
import { prepaidRoutes } from './prepaid.routes';

@NgModule({
  declarations: [
    PrepaidShellComponent,
    PrepaidProvidersPageComponent,
    PrepaidDepositsPageComponent,
    PrepaidBalancesPageComponent,
    PrepaidConfigsPageComponent,
  ],
  providers: [ConfirmationService],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(prepaidRoutes),
    Button,
    Card,
    Dialog,
    ConfirmDialog,
    InputNumber,
    InputText,
    Password,
    Select,
    TableModule,
    ToggleSwitchModule,
    Toast,
  ],
})
export class PrepaidModule {}
