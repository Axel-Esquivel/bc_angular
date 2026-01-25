import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Toast } from 'primeng/toast';

import { OrganizationModulesSetupComponent } from './organization-modules-setup.component';

const routes: Routes = [{ path: '', component: OrganizationModulesSetupComponent }];

@NgModule({
  declarations: [OrganizationModulesSetupComponent],
  imports: [CommonModule, RouterModule.forChild(routes), Card, Button, Toast],
})
export class OrganizationModulesSetupModule {}
