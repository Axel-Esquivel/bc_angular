import { Inject, Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';

import { APP_CONFIG_TOKEN, AppConfig } from '../config/app-config';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class ChatSocketService {
  private socket?: Socket;

  constructor(
    private readonly auth: AuthService,
    @Inject(APP_CONFIG_TOKEN) private readonly config: AppConfig
  ) {
    this.connect();
  }

  private connect(): void {
    const token = this.auth.getAccessToken();

    this.socket = io('/chat', {
      path: this.config.socketUrl ?? '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
      auth: token ? { token: `Bearer ${token}` } : undefined,
    });
  }

  sendMessage(payload: any): void {
    this.socket?.emit('chat:message:sent', payload);
  }

  onMessage(handler: (msg: any) => void): void {
    this.socket?.on('chat:message:received', handler);
  }

  onTyping(handler: (info: any) => void): void {
    this.socket?.on('chat:user:typing', handler);
  }
}
