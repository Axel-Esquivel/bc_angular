import { Inject, Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, catchError, finalize, of, take, tap } from 'rxjs';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { HealthApiService } from '../api/health-api.service';

@Injectable({ providedIn: 'root' })
export class RealtimeSocketService {
  private socket?: Socket;
  private isConnecting = false;
  private authToken: string | null = null;
  private readonly connectedSubject = new BehaviorSubject<boolean>(false);
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isManualDisconnect = false;
  private readonly maxReconnectAttempts = 5;
  private readonly baseReconnectDelayMs = 1000;
  private readonly maxReconnectDelayMs = 15000;
  private readonly reconnectJitterMs = 250;

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

    this.isManualDisconnect = false;
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
            reconnection: false,
          });

          this.socket.on('connect', () => {
            this.reconnectAttempts = 0;
            this.connectedSubject.next(true);
          });

          this.socket.on('disconnect', () => {
            this.connectedSubject.next(false);
            this.scheduleReconnect();
          });

          this.socket.on('connect_error', () => {
            this.connectedSubject.next(false);
            this.scheduleReconnect();
          });
        }),
        catchError(() => {
          this.scheduleReconnect();
          return of(null);
        }),
        finalize(() => {
          this.isConnecting = false;
        })
      )
      .subscribe();
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }

    this.isManualDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
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

  private scheduleReconnect(): void {
    if (this.isManualDisconnect || this.socket) {
      return;
    }
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    if (this.reconnectTimer) {
      return;
    }

    const exponent = Math.min(this.reconnectAttempts, 10);
    const delay = Math.min(this.baseReconnectDelayMs * 2 ** exponent, this.maxReconnectDelayMs);
    const jitter = Math.floor(Math.random() * this.reconnectJitterMs);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay + jitter);
  }
}
