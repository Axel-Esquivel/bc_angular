import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'bc-theme';
  private readonly themeSubject = new BehaviorSubject<ThemeMode>('light');
  readonly theme$: Observable<ThemeMode> = this.themeSubject.asObservable();

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  getTheme(): ThemeMode {
    return this.themeSubject.value;
  }

  initTheme(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const storedTheme = localStorage.getItem(this.storageKey) as ThemeMode | null;
    const theme = storedTheme === 'dark' ? 'dark' : 'light';
    this.applyTheme(theme);
  }

  setTheme(theme: ThemeMode): void {
    this.applyTheme(theme);
  }

  toggleTheme(): void {
    const nextTheme: ThemeMode = this.themeSubject.value === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
  }

  private applyTheme(theme: ThemeMode): void {
    this.themeSubject.next(theme);

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Previously, theme changes only updated state and never affected the DOM or persistence.
    localStorage.setItem(this.storageKey, theme);
    this.document.documentElement.classList.toggle('bc-dark', theme === 'dark');
  }
}
