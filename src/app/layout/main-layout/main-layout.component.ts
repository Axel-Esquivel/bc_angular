import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SelectChangeEvent, SelectModule } from 'primeng/select';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { PanelMenuModule } from 'primeng/panelmenu';

import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { TranslationService } from '../../core/i18n/translation.service';
import { ModuleMenuService } from '../../core/layout/module-menu.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ToolbarModule, ButtonModule, SelectModule, PanelMenuModule],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly translationService = inject(TranslationService);
  private readonly moduleMenuService = inject(ModuleMenuService);

  readonly languages = [
    { label: 'Español', value: 'es' },
    { label: 'English', value: 'en' },
  ];

  readonly themes = [
    { label: 'Claro', value: 'lara-light-blue' },
    { label: 'Oscuro', value: 'lara-dark-blue' },
  ];

  readonly menuItems$ = this.moduleMenuService.getMenuItems();

  readonly currentUser$ = this.authService.getCurrentUser();

  onThemeChange(event: SelectChangeEvent): void {
    if (event.value) {
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
  }
}
