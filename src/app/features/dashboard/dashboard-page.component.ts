import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Card } from 'primeng/card';
import { Badge } from 'primeng/badge';
import { Button } from 'primeng/button';

import { DashboardApiService } from '../../core/api/dashboard-api.service';
import { ModulesApiService, ModuleDefinition } from '../../core/api/modules-api.service';
import { DashboardOverview } from '../../shared/models/dashboard.model';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, Card, Badge, Button, RouterLink],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly modulesApi = inject(ModulesApiService);
  private readonly destroyRef = inject(DestroyRef);

  workspaceId = this.route.snapshot.paramMap.get('id') ?? '';
  pendingModules: Array<{ key: string; name: string }> = [];
  isOwner = false;
  setupQueryParams: { orgId: string; companyId?: string } | null = null;
  overview: DashboardOverview | null = null;

  ngOnInit(): void {
    if (!this.workspaceId) {
      this.workspaceId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    }
    if (!this.workspaceId) {
      return;
    }

    this.dashboardApi
      .getOverview({ companyId: this.workspaceId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.overview = response.result ?? null;
        this.isOwner = this.overview?.currentOrgRoleKey === 'owner';
        const orgId = this.overview?.currentOrgId;
        this.setupQueryParams = orgId ? { orgId, companyId: this.workspaceId } : null;
        this.loadPendingModules();
      });
  }

  private loadPendingModules(): void {
    if (!this.workspaceId || !this.overview) {
      return;
    }
    if (!this.isOwner) {
      this.pendingModules = [];
      return;
    }

    const pendingKeys = new Set(this.overview.modulesPendingConfig ?? []);
    if (pendingKeys.size === 0) {
      this.pendingModules = [];
      return;
    }

    this.modulesApi
      .getDefinitions(this.workspaceId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((res) => {
        const definitions: ModuleDefinition[] = res.result ?? [];
        const mapped = definitions
          .filter((module) => pendingKeys.has(module.id))
          .map((module) => ({ key: module.id, name: module.name }));
        const missing = Array.from(pendingKeys).filter(
          (key) => !definitions.some((module) => module.id === key)
        );
        this.pendingModules = [
          ...mapped,
          ...missing.map((key) => ({ key, name: key })),
        ];
      });
  }
}
