import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Button } from 'primeng/button';

import { HealthApiService } from './core/api/health-api.service';
import { RealtimeSocketService } from './core/services/realtime-socket.service';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Button],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  readonly title = signal('business-control');

  constructor(
    private readonly theme: ThemeService,
    private readonly healthApi: HealthApiService,
    private readonly realtimeSocket: RealtimeSocketService
  ) {}

  ngOnInit(): void {
    this.theme.initTheme();
    this.realtimeSocket.ensureConnected();
    this.healthApi.getStatus().subscribe({
      next: (response) => {
        // eslint-disable-next-line no-console
        console.log('[api] health', response.result);
      },
      error: (error) => {
        // eslint-disable-next-line no-console
        console.warn('[api] health failed', error);
      },
    });
  }

  toggleTheme(): void {
    this.theme.toggleTheme();
  }
}
