import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DividerModule } from 'primeng/divider';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';

import { ModulesSettingsPageComponent } from './pages/modules-settings-page/modules-settings-page.component';
import { settingsRoutes } from './settings.routes';

@NgModule({
  declarations: [ModulesSettingsPageComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(settingsRoutes),
    ButtonModule,
    CardModule,
    CheckboxModule,
    DividerModule,
    FloatLabelModule,
    InputTextModule,
    ToastModule,
  ],
})
export class SettingsModule {}
