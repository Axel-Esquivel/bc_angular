import { Routes } from '@angular/router';

import { ModuleStoreShellComponent } from './shells/module-store-shell/module-store-shell.component';
import { ModuleStorePageComponent } from '../app/pages/module-store-page/module-store-page.component';

export const setupRoutes: Routes = [
  {
    path: 'modules',
    component: ModuleStoreShellComponent,
    children: [
      { path: 'store', component: ModuleStorePageComponent },
    ],
  },
];
