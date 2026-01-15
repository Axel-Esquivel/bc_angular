import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Button } from 'primeng/button';

import { AuthService } from './core/auth/auth.service';
import { HealthApiService } from './core/api/health-api.service';
import { RealtimeSocketService } from './core/services/realtime-socket.service';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, Button],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  readonly title = signal('business-control');
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);
  private readonly healthApi = inject(HealthApiService);
  private readonly realtimeSocket = inject(RealtimeSocketService);
  private readonly router = inject(Router);

  readonly theme$ = this.theme.theme$;
  readonly isAuthenticated$ = this.auth.isAuthenticated$;

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

  toggleTheme(): void {
    this.theme.toggleTheme();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
