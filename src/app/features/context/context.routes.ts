import { Routes } from '@angular/router';

import { ContextShellComponent } from './shell/context-shell.component';
import { ContextSelectPageComponent } from './pages/context-select-page/context-select-page.component';

export const contextRoutes: Routes = [
  {
    path: '',
    component: ContextShellComponent,
    children: [
      { path: 'select', component: ContextSelectPageComponent },
      { path: '', redirectTo: 'select', pathMatch: 'full' },
    ],
  },
];
