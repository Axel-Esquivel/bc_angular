import { Routes } from '@angular/router';

import { ModuleStorePageComponent } from './pages/module-store-page/module-store-page.component';
import { SetupShellComponent } from './shell/setup-shell.component';
import { SetupModulesGuard } from '../../core/guards/setup-modules.guard';

export const SETUP_ROUTES: Routes = [
  {
    path: '',
    component: SetupShellComponent,
    canActivate: [SetupModulesGuard],
    children: [
      { path: 'modules/store', component: ModuleStorePageComponent },
    ],
  },
];
