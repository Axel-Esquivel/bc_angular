import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { OrganizationModuleOverviewItem } from '../../../../shared/models/organization-modules.model';

@Component({
  selector: 'app-prepaid-shell',
  standalone: false,
  templateUrl: './prepaid-shell.component.html',
  styleUrl: './prepaid-shell.component.scss',
})
export class PrepaidShellComponent implements OnInit {
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly router = inject(Router);

  contextMissing = false;
  moduleEnabled = true;
  loading = false;

  ngOnInit(): void {
    const context = this.activeContextState.getActiveContext();
    const organizationId = context.organizationId ?? null;
    const enterpriseId = context.enterpriseId ?? null;
    if (!organizationId || !enterpriseId) {
      this.contextMissing = true;
      return;
    }
    this.loading = true;
    this.organizationsApi.getModulesOverview(organizationId).subscribe({
      next: (response) => {
        const modules = response.result?.modules ?? [];
        this.moduleEnabled = this.isModuleEnabled(modules, 'prepaid');
        this.loading = false;
      },
      error: () => {
        this.moduleEnabled = false;
        this.loading = false;
      },
    });
  }

  goToStore(): void {
    void this.router.navigate(['/setup/modules/store'], { queryParams: { returnUrl: '/app/home' } });
  }

  private isModuleEnabled(modules: OrganizationModuleOverviewItem[], key: string): boolean {
    const module = modules.find((item) => item.key === key);
    if (!module) {
      return false;
    }
    return module.state?.status !== 'disabled';
  }
}
