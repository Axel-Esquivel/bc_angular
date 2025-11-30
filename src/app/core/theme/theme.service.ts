import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeSubject = new BehaviorSubject<string>('lara-light-blue');
  readonly theme$: Observable<string> = this.themeSubject.asObservable();

  getCurrentTheme(): string {
    return this.themeSubject.value;
  }

  setTheme(theme: string): void {
    this.themeSubject.next(theme);
  }
}
