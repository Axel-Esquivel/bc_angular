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

  private connect(): void {
    const token = this.auth.getAccessToken();

    this.socket = io('/realtime', {
      path: this.config.socketUrl ?? '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
      auth: token ? { token: `Bearer ${token}` } : undefined,
    });
  }

  on<T>(event: string, handler: (data: T) => void): void {
    this.socket?.on(event, handler as any);
  }

  emit<T>(event: string, data: T): void {
    this.socket?.emit(event, data);
  }
}
