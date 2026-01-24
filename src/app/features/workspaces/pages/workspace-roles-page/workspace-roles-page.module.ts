import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Toast } from 'primeng/toast';

import { WorkspaceRolesPageComponent } from './workspace-roles-page.component';

const routes: Routes = [{ path: '', component: WorkspaceRolesPageComponent }];

@NgModule({
  declarations: [WorkspaceRolesPageComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    Card,
    Button,
    DialogModule,
    InputText,
    Select,
    TableModule,
    Toast,
  ],
  providers: [MessageService],
})
export class WorkspaceRolesPageModule {}
