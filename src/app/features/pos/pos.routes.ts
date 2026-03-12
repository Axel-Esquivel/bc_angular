import { Routes } from '@angular/router';
import { PosTerminalPageComponent } from './pages/pos-terminal-page/pos-terminal-page.component';
import { PosConfigsPageComponent } from './pages/pos-configs-page/pos-configs-page.component';

export const posRoutes: Routes = [
  { path: 'configs', component: PosConfigsPageComponent },
  { path: '', component: PosTerminalPageComponent },
];
