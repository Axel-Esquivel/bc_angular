import { Routes, UrlMatcher } from '@angular/router';

import { AppShellComponent } from './shell/app-shell.component';
import { AppDashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { StockListPageComponent } from '../inventory/pages/stock-list-page/stock-list-page.component';
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
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', component: AppDashboardPageComponent },
      { path: 'pos', loadChildren: () => import('../pos/pos.module').then((m) => m.PosModule) },
      { path: 'products', loadChildren: () => import('../products/products.module').then((m) => m.ProductsModule) },
      {
        path: 'catalogs/products',
        loadChildren: () => import('../products/products.module').then((m) => m.ProductsModule),
      },
      { path: 'inventory', component: StockListPageComponent },
      { matcher: moduleMatcher, component: ModulePlaceholderPageComponent },
    ],
  },
];
