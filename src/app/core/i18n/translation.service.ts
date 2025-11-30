import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly languageSubject = new BehaviorSubject<string>('es');
  readonly language$: Observable<string> = this.languageSubject.asObservable();

  getCurrentLanguage(): string {
    return this.languageSubject.value;
  }

  setLanguage(language: string): void {
    this.languageSubject.next(language);
  }
}
