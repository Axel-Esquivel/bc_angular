import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { HealthApiService } from './core/api/health-api.service';
import { RealtimeSocketService } from './core/services/realtime-socket.service';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  readonly title = signal('business-control');
  private readonly theme = inject(ThemeService);
  private readonly healthApi = inject(HealthApiService);
  private readonly realtimeSocket = inject(RealtimeSocketService);

  constructor() {}

  ngOnInit(): void {
    this.theme.initTheme();
    this.realtimeSocket.ensureConnected();
    this.healthApi.getStatus().subscribe({
      next: (response) => {
      },
      error: (error) => {
      },
    });
  }
}
