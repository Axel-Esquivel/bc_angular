import { Routes, UrlMatcher } from '@angular/router';

import { AppShellComponent } from './shell/app-shell.component';
import { AppDashboardPageComponent } from './pages/dashboard-page/dashboard-page.component';
import { StockPageComponent } from '../inventory/pages/stock-page/stock-page.component';
import { MovementsPageComponent } from '../inventory/pages/movements-page/movements-page.component';
import { AdjustmentsPageComponent } from '../inventory/pages/adjustments-page/adjustments-page.component';
import { TransfersPageComponent } from '../inventory/pages/transfers-page/transfers-page.component';
import { ReservationsPageComponent } from '../inventory/pages/reservations-page/reservations-page.component';
import { EventsPageComponent } from '../inventory/pages/events-page/events-page.component';
import { WarehousesPageComponent } from '../warehouses/pages/warehouses-page/warehouses-page.component';
import { ModulePlaceholderPageComponent } from './modules/module-placeholder-page/module-placeholder-page.component';
import { ActiveContextGuard } from '../../core/guards/active-context.guard';

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
    canActivate: [ActiveContextGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      { path: 'home', component: AppDashboardPageComponent },
      { path: 'pos', loadChildren: () => import('../pos/pos.module').then((m) => m.PosModule) },
      { path: 'products', loadChildren: () => import('../products/products.module').then((m) => m.ProductsModule) },
      { path: 'providers', loadChildren: () => import('../providers/providers.module').then((m) => m.ProvidersModule) },
      { path: 'purchases', loadChildren: () => import('../purchases/purchases.module').then((m) => m.PurchasesModule) },
      { path: 'prepaid', loadChildren: () => import('../prepaid/prepaid.module').then((m) => m.PrepaidModule) },
      { path: 'settings', loadChildren: () => import('../settings/settings.module').then((m) => m.SettingsModule) },
      { path: 'inventory', component: StockPageComponent },
      { path: 'inventory/movements', component: MovementsPageComponent },
      { path: 'inventory/adjustments', component: AdjustmentsPageComponent },
      { path: 'inventory/transfers', component: TransfersPageComponent },
      { path: 'inventory/reservations', component: ReservationsPageComponent },
      { path: 'inventory/events', component: EventsPageComponent },
      { path: 'warehouses', component: WarehousesPageComponent },
      { matcher: moduleMatcher, component: ModulePlaceholderPageComponent },
    ],
  },
];
