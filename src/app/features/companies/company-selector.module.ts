import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Select } from 'primeng/select';
import { Toast } from 'primeng/toast';

import { CompanySelectorComponent } from './pages/company-selector/company-selector.component';

const routes: Routes = [{ path: '', component: CompanySelectorComponent }];

@NgModule({
  declarations: [CompanySelectorComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes), Card, Button, Select, Toast],
  providers: [MessageService],
})
export class CompanySelectorModule {}
