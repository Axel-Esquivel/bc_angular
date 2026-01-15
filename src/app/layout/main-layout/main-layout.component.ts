import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Select, SelectChangeEvent } from 'primeng/select';
import { Toolbar } from 'primeng/toolbar';
import { Button } from 'primeng/button';
import { PanelMenu } from 'primeng/panelmenu';

import { AuthService } from '../../core/auth/auth.service';
import { ThemeService, ThemeMode } from '../../core/theme/theme.service';
import { TranslationService } from '../../core/i18n/translation.service';
import { ModuleMenuService } from '../../core/layout/module-menu.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, Toolbar, Button, Select, PanelMenu],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly translationService = inject(TranslationService);
  private readonly moduleMenuService = inject(ModuleMenuService);
  private readonly router = inject(Router);

  readonly languages = [
    { label: 'Español', value: 'es' },
    { label: 'English', value: 'en' },
  ];

  readonly themes: { label: string; value: ThemeMode }[] = [
    { label: 'Claro', value: 'light' },
    { label: 'Oscuro', value: 'dark' },
  ];

  readonly theme$ = this.themeService.theme$;

  readonly menuItems$ = this.moduleMenuService.getMenuItems();

  readonly currentUser$ = this.authService.getCurrentUser();

  onThemeChange(event: SelectChangeEvent): void {
    if (event.value === 'light' || event.value === 'dark') {
      this.themeService.setTheme(event.value);
    }
  }

  onLanguageChange(event: SelectChangeEvent): void {
    if (event.value) {
      this.translationService.setLanguage(event.value);
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
