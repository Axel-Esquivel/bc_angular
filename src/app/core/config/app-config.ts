import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface AppConfig {
  apiBaseUrl: string;
  socketUrl?: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  defaultTheme: string;
  availableThemes: string[];
}

export const APP_CONFIG_TOKEN = new InjectionToken<AppConfig>('APP_CONFIG');

export const APP_CONFIG: AppConfig = {
  apiBaseUrl: environment.apiBaseUrl,
  socketUrl: environment.socketUrl,
  defaultLanguage: 'es',
  supportedLanguages: ['es', 'en'],
  defaultTheme: 'lara-light-blue',
  availableThemes: ['lara-light-blue', 'lara-dark-blue'],
};
