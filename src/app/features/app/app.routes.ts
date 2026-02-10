import { Routes, UrlMatcher } from '@angular/router';

import { AppShellComponent } from './shell/app-shell.component';
import { AppDashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { ModuleStorePageComponent } from './pages/module-store-page/module-store-page.component';
import { ModulePlaceholderPageComponent } from './modules/module-placeholder-page/module-placeholder-page.component';

const moduleMatcher: UrlMatcher = (segments) => {
  if (segments.length === 0) {
    return null;
  }
  return {
    consumed: segments,
    posParams: {
      moduleKey: segments[0],
    },
  };
};

export const appRoutes: Routes = [
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: '', component: AppDashboardPageComponent },
      { path: 'modules/store', component: ModuleStorePageComponent },
      { matcher: moduleMatcher, component: ModulePlaceholderPageComponent },
    ],
  },
];
