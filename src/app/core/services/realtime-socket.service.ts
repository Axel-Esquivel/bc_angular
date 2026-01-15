import { Inject, Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class RealtimeSocketService {
  private socket?: Socket;

  constructor(
    private readonly auth: AuthService,
    @Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig
  ) {
    this.connect();
  }

  ensureConnected(): void {
    if (!this.socket) {
      this.connect();
    }
  }

  private connect(): void {
    const token = this.auth.getAccessToken();
    const socketConfig = this.resolveSocketConfig();

    this.socket = io(socketConfig.url, {
      path: socketConfig.path,
      transports: ['websocket'],
      withCredentials: true,
      auth: token ? { token: `Bearer ${token}` } : undefined,
    });

    this.socket.on('connect', () => {
      // eslint-disable-next-line no-console
      console.log('[ws] connected', this.socket?.id);
    });
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
    const path = isAbsolute ? '/socket.io' : rawSocketUrl || '/socket.io';
    const url = isAbsolute ? `${rawSocketUrl.replace(/\/$/, '')}/realtime` : '/realtime';
    return { url, path };
  }
}
