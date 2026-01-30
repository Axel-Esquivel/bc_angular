import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { combineLatest, distinctUntilChanged, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { HealthApiService } from './core/api/health-api.service';
import { RealtimeSocketService } from './core/services/realtime-socket.service';
import { ThemeService } from './core/theme/theme.service';
import { AuthService } from './core/auth/auth.service';
import { CompanyStateService } from './core/company/company-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  readonly title = signal('business-control');
  private readonly destroyRef = inject(DestroyRef);
  private readonly theme = inject(ThemeService);
  private readonly healthApi = inject(HealthApiService);
  private readonly realtimeSocket = inject(RealtimeSocketService);
  private readonly auth = inject(AuthService);
  private readonly companyState = inject(CompanyStateService);

  constructor() {}

  ngOnInit(): void {
    this.theme.initTheme();
    combineLatest([this.auth.isAuthenticated$, this.companyState.activeCompanyId$])
      .pipe(
        map(([isAuthenticated, workspaceId]) => ({
          shouldConnect: isAuthenticated && !!workspaceId,
        })),
        distinctUntilChanged((prev, next) => prev.shouldConnect === next.shouldConnect),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ shouldConnect }) => {
        if (!shouldConnect) {
          this.realtimeSocket.disconnect();
        }
      });
    this.healthApi.getStatus().subscribe({
      next: (response) => {
      },
      error: (error) => {
      },
    });
  }
}


