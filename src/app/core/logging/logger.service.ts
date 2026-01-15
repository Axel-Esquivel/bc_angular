import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

type LogMethod = 'debug' | 'info' | 'warn';

@Injectable({ providedIn: 'root' })
export class LoggerService {
  debug(...args: unknown[]): void {
    this.emit('debug', args);
  }

  info(...args: unknown[]): void {
    this.emit('info', args);
  }

  warn(...args: unknown[]): void {
    this.emit('warn', args);
  }

  private emit(method: LogMethod, args: unknown[]): void {
    if (!environment.debugLogs) {
      return;
    }

    const logger = (globalThis as { [key: string]: any })['console'];
    const fn = logger?.[method];
    if (typeof fn === 'function') {
      fn(...args);
    }
  }
}
