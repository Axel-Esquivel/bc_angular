import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Chip } from 'primeng/chip';
import { Tag } from 'primeng/tag';
import { distinctUntilChanged, map } from 'rxjs';

import { OrganizationsService } from '../../../core/api/organizations-api.service';
import { ActiveContextStateService } from '../../../core/context/active-context-state.service';
import { OrganizationModuleStoreItem } from '../../../shared/models/organization-module-store.model';

@Component({
  selector: 'app-app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Button, Card, Chip, Tag],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  providers: [MessageService],
})
export class AppShellComponent implements OnInit {
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  modules: OrganizationModuleStoreItem[] = [];
  isLoading = false;
  organizationId: string | null = null;
  private readonly installing = new Set<string>();

  ngOnInit(): void {
    this.activeContextState.activeContext$
      .pipe(
        map((context) => context.organizationId ?? null),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((organizationId) => {
        this.organizationId = organizationId;
        if (!organizationId) {
          this.modules = [];
          return;
        }
        this.loadModules(organizationId);
      });
  }

  isInstalling(moduleKey: string): boolean {
    return this.installing.has(moduleKey);
  }

  installModule(module: OrganizationModuleStoreItem): void {
    if (!this.organizationId || module.installed || this.isInstalling(module.key)) {
      return;
    }

    this.installing.add(module.key);
    this.organizationsApi
      .installModule(this.organizationId, module.key)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const installed = response.result?.installed ?? [];
          const alreadyInstalled = response.result?.alreadyInstalled ?? [];
          const dependencyCount = installed.filter((key) => key !== module.key).length;
          this.messageService.add({
            severity: 'success',
            summary: 'Instalacion completada',
            detail: `Instalados: ${installed.length}. Dependencias instaladas: ${dependencyCount}. Ya instalados: ${alreadyInstalled.length}.`,
          });
          this.installing.delete(module.key);
          const orgId = this.organizationId;
          if (orgId) {
            this.loadModules(orgId);
          }
        },
        error: () => {
          this.installing.delete(module.key);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo instalar el modulo.',
          });
        },
      });
  }

  private loadModules(organizationId: string): void {
    this.isLoading = true;
    this.organizationsApi
      .getAvailableModules(organizationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.modules = response.result?.modules ?? [];
          this.isLoading = false;
        },
        error: () => {
          this.modules = [];
          this.isLoading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los modulos instalables.',
          });
        },
      });
  }
}
