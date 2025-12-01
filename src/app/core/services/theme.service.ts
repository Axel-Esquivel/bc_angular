import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private isDark = false;

  enableDark(): void {
    this.isDark = true;
    document.documentElement.classList.add('p-dark');
  }

  enableLight(): void {
    this.isDark = false;
    document.documentElement.classList.remove('p-dark');
  }

  toggle(): void {
    this.isDark ? this.enableLight() : this.enableDark();
  }
}
