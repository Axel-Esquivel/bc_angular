import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Card } from 'primeng/card';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-module-placeholder-page',
  standalone: true,
  imports: [CommonModule, Card],
  templateUrl: './module-placeholder-page.component.html',
  styleUrl: './module-placeholder-page.component.scss',
})
export class ModulePlaceholderPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly authService = inject(AuthService);
  readonly moduleKey = this.route.snapshot.paramMap.get('moduleKey') ?? '';
  installed: boolean | null = null;

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    const organizationId =
      this.activeContextState.getActiveContext().organizationId ??
      user?.defaults?.organizationId ??
      user?.defaultOrganizationId ??
      null;
    if (!organizationId || !this.moduleKey) {
      this.installed = null;
      return;
    }

    this.organizationsApi
      .getModulesOverview(organizationId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const modules = response?.result?.modules ?? [];
          const match = modules.find((module) => module.key === this.moduleKey);
          this.installed = match ? match.state?.status !== 'disabled' : false;
        },
        error: () => {
          this.installed = null;
        },
      });
  }
}
