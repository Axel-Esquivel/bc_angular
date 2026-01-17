import { Inject, Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, catchError, map, of, take, tap } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { HealthApiService } from '../api/health-api.service';

@Injectable({ providedIn: 'root' })
export class RealtimeSocketService {
  private socket?: Socket;
  private isConnecting = false;
  private authToken: string | null = null;
  private readonly connectedSubject = new BehaviorSubject<boolean>(false);

  readonly isConnected$ = this.connectedSubject.asObservable();

  constructor(
    private readonly healthApi: HealthApiService,
    @Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig
  ) {}

  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  connect(): void {
    if (this.socket || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.healthApi
      .getStatus()
      .pipe(
        take(1),
        tap(() => {
          const token = this.authToken;
          const socketConfig = this.resolveSocketConfig();

          this.socket = io(socketConfig.url, {
            path: socketConfig.path,
            transports: ['websocket'],
            withCredentials: true,
            auth: token ? { token: `Bearer ${token}` } : undefined,
            autoConnect: true,
          });

          this.socket.on('connect', () => {
            this.connectedSubject.next(true);
          });

          this.socket.on('disconnect', () => {
            this.connectedSubject.next(false);
          });
        }),
        catchError(() => of(null))
      )
      .subscribe({
        complete: () => {
          this.isConnecting = false;
        },
      });
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }

    this.socket.disconnect();
    this.socket = undefined;
    this.connectedSubject.next(false);
  }

  on<T>(event: string, handler: (data: T) => void): void {
    this.socket?.on(event, handler as any);
  }

  emit<T>(event: string, data: T): void {
    this.socket?.emit(event, data);
  }

  private resolveSocketConfig(): { url: string; path: string } {
    const rawSocketUrl = this.config.socketUrl ?? '';
    const isAbsolute = /^https?:\/\//i.test(rawSocketUrl);

    if (!rawSocketUrl) {
      return { url: '', path: '/socket.io' };
    }

    if (rawSocketUrl.includes('/socket.io')) {
      const url = isAbsolute ? rawSocketUrl.replace(/\/socket\.io\/?$/, '') : '';
      return { url, path: rawSocketUrl };
    }

    return { url: rawSocketUrl, path: '/socket.io' };
  }
}
