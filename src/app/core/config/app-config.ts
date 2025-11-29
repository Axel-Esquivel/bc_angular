import { InjectionToken } from '@angular/core';

export interface AppConfig {
  apiBaseUrl: string;
  socketUrl?: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  defaultTheme: string;
  availableThemes: string[];
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

export const DEFAULT_APP_CONFIG: AppConfig = {
  apiBaseUrl: '/api',
  socketUrl: 'http://localhost:3000',
  defaultLanguage: 'es',
  supportedLanguages: ['es', 'en'],
  defaultTheme: 'lara-light-blue',
  availableThemes: ['lara-light-blue', 'lara-dark-blue'],
};
