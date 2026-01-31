import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { OrganizationModuleOverviewItem } from '../../../../shared/models/organization-modules.model';
import { take } from 'rxjs';

@Component({
  selector: 'app-app-dashboard-page',
  standalone: true,
  imports: [CommonModule, Card, Tag],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class AppDashboardPageComponent implements OnInit {
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly authService = inject(AuthService);

  modules: OrganizationModuleOverviewItem[] = [];
  loading = false;

  ngOnInit(): void {
    const organizationId =
      this.activeContextState.getActiveContext().organizationId ??
      this.authService.getCurrentUser()?.defaultOrganizationId ??
      null;
    if (!organizationId) {
      this.modules = [];
      return;
    }

    this.loading = true;
    this.organizationsApi
      .getModules(organizationId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.modules = response?.result?.modules ?? [];
          this.loading = false;
        },
        error: () => {
          this.modules = [];
          this.loading = false;
        },
      });
  }

  get enabledModules(): OrganizationModuleOverviewItem[] {
    return this.modules.filter((module) => module.state?.status !== 'disabled' && !module.isSystem);
  }
}
