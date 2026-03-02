import { Routes } from '@angular/router';

import { ModulesSettingsPageComponent } from './pages/modules-settings-page/modules-settings-page.component';
import { PackagingNamesPageComponent } from './pages/packaging-names-page/packaging-names-page.component';

export const settingsRoutes: Routes = [
  { path: 'modules', component: ModulesSettingsPageComponent },
  { path: 'packaging', component: PackagingNamesPageComponent },
  { path: '', redirectTo: 'modules', pathMatch: 'full' },
];
