import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { WorkspaceModulesService } from '../../../../core/workspace/workspace-modules.service';
import {
  WorkspaceModuleCatalogEntry,
  WorkspaceModuleState,
  WorkspaceModulesOverview,
} from '../../../../shared/models/workspace-modules.model';

@Component({
  selector: 'app-workspace-launcher',
  standalone: true,
  imports: [CommonModule, Card, Tag, Toast],
  templateUrl: './workspace-launcher.component.html',
  styleUrl: './workspace-launcher.component.scss',
  providers: [MessageService],
})
export class WorkspaceLauncherComponent implements OnInit, OnDestroy {
  private readonly workspaceModules = inject(WorkspaceModulesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  workspaceId: string | null = null;
  overview: WorkspaceModulesOverview | null = null;
  visibleModules: WorkspaceModuleCatalogEntry[] = [];
  enabledModuleKeys = new Set<string>();

  ngOnInit(): void {
    this.workspaceId = this.route.parent?.snapshot.paramMap.get('id') ?? null;

    this.workspaceModules.overview$.pipe(takeUntil(this.destroy$)).subscribe((overview) => {
      this.overview = overview;
      this.enabledModuleKeys = new Set((overview?.enabledModules ?? []).filter((m) => m.enabled).map((m) => m.key));
      this.visibleModules = this.buildVisibleModules(overview);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openModule(module: WorkspaceModuleCatalogEntry): void {
    if (!this.workspaceId) {
      return;
    }

    if (!this.enabledModuleKeys.has(module.key)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Modulo inactivo',
        detail: 'Activa el modulo para poder ingresar.',
      });
      return;
    }

    const route = this.getModuleRoute(module.key);
    if (!route) {
      this.messageService.add({
        severity: 'info',
        summary: 'Modulo en preparacion',
        detail: 'Este modulo se habilitara en proximas iteraciones.',
      });
      return;
    }

    this.router.navigate(route);
  }

  isEnabled(module: WorkspaceModuleCatalogEntry): boolean {
    return this.enabledModuleKeys.has(module.key);
  }

  private buildVisibleModules(overview: WorkspaceModulesOverview | null): WorkspaceModuleCatalogEntry[] {
    if (!overview) {
      return [];
    }

    if (overview.userRole === 'member') {
      return overview.availableModules.filter((module) => this.enabledModuleKeys.has(module.key));
    }

    return overview.availableModules;
  }

  private getModuleRoute(moduleKey: string): string[] | null {
    if (!this.workspaceId) {
      return null;
    }

    const routeMap: Record<string, string[]> = {
      products: ['/company', this.workspaceId, 'products'],
      inventory: ['/company', this.workspaceId, 'inventory', 'stock'],
      pos: ['/company', this.workspaceId, 'pos'],
      reports: ['/company', this.workspaceId, 'reports'],
      dashboard: ['/company', this.workspaceId, 'dashboard'],
    };

    return routeMap[moduleKey] ?? ['/company', this.workspaceId, 'dashboard'];
  }
}
