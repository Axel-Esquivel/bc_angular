import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Card } from 'primeng/card';
import { Badge } from 'primeng/badge';
import { Button } from 'primeng/button';

import { WorkspaceModulesService } from '../../core/workspace/workspace-modules.service';
import { WorkspaceModuleCatalogEntry } from '../../shared/models/workspace-modules.model';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, Card, Badge, Button, RouterLink],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly workspaceModules = inject(WorkspaceModulesService);
  private readonly destroyRef = inject(DestroyRef);

  workspaceId = this.route.snapshot.paramMap.get('id') ?? '';
  pendingModules: WorkspaceModuleCatalogEntry[] = [];

  ngOnInit(): void {
    if (!this.workspaceId) {
      this.workspaceId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    }

    this.workspaceModules.overview$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((overview) => {
        const enabled = overview?.enabledModules ?? [];
        const pendingKeys = new Set(
          enabled.filter((module) => module.enabled && module.configured === false).map((module) => module.key)
        );
        const available = overview?.availableModules ?? [];
        this.pendingModules = available.filter((module) => pendingKeys.has(module.key));
      });
  }
}
