import { Routes } from '@angular/router';

import { ModulesSettingsPageComponent } from './pages/modules-settings-page/modules-settings-page.component';

export const settingsRoutes: Routes = [
  { path: 'modules', component: ModulesSettingsPageComponent },
  { path: '', redirectTo: 'modules', pathMatch: 'full' },
];
