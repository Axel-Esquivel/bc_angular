import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

import { OnboardingPageComponent } from './onboarding-page/onboarding-page.component';

const routes: Routes = [{ path: '', component: OnboardingPageComponent }];

@NgModule({
  declarations: [OnboardingPageComponent],
  imports: [CommonModule, RouterModule.forChild(routes), ButtonModule, CardModule],
})
export class OnboardingModule {}
