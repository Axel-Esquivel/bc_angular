import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';

import { ModulesSettingsPageComponent } from './pages/modules-settings-page/modules-settings-page.component';
import { PackagingNamesPageComponent } from './pages/packaging-names-page/packaging-names-page.component';
import { settingsRoutes } from './settings.routes';

@NgModule({
  declarations: [ModulesSettingsPageComponent, PackagingNamesPageComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(settingsRoutes),
    ButtonModule,
    CardModule,
    CheckboxModule,
    DividerModule,
    DialogModule,
    FloatLabelModule,
    InputNumberModule,
    InputTextModule,
    TableModule,
    ToastModule,
    ToolbarModule,
  ],
})
export class SettingsModule {}
