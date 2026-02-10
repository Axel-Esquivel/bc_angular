import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Chip } from 'primeng/chip';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Tag } from 'primeng/tag';
import { finalize, map, distinctUntilChanged, timeout } from 'rxjs';

import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import {
  OrganizationModuleStoreItem,
  OrganizationModuleStoreResponse,
} from '../../../../shared/models/organization-module-store.model';
import { environment } from '../../../../../environments/environment';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../../core/auth/auth.service';
import { IOrganization } from '../../../../shared/models/organization.model';

@Component({
  selector: 'app-module-store-page',
  standalone: true,
  imports: [CommonModule, Button, Card, Chip, Tag, ConfirmDialog],
  templateUrl: './module-store-page.component.html',
  styleUrl: './module-store-page.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class ModuleStorePageComponent implements OnInit {
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);

  modules: OrganizationModuleStoreItem[] = [];
  isLoading = false;
  organizationId: string | null = null;
  organization: IOrganization | null = null;
  isOwner = false;
  errorMessage: string | null = null;
  private readonly installing = new Set<string>();
  private readonly uninstalling = new Set<string>();

  ngOnInit(): void {
    this.activeContextState.activeContext$
      .pipe(
        map((context) => context.organizationId ?? null),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((organizationId) => {
        this.organizationId = organizationId;
        this.organization = null;
        this.isOwner = false;
        if (environment.debugLogs) {
          // eslint-disable-next-line no-console
          console.debug('[ModuleStore] orgId', organizationId);
        }
        if (!organizationId) {
          this.modules = [];
          return;
        }
        this.loadOrganization(organizationId);
        this.loadModules(organizationId);
      });
  }

  isInstalling(moduleKey: string): boolean {
    return this.installing.has(moduleKey);
  }

  isUninstalling(moduleKey: string): boolean {
    return this.uninstalling.has(moduleKey);
  }

  installModule(module: OrganizationModuleStoreItem): void {
    if (!this.organizationId || module.installed || this.isInstalling(module.key)) {
      return;
    }

    this.confirmationService.confirm({
      header: 'Instalar modulo',
      message: `Se instalaran las dependencias necesarias para ${module.name}. ¿Continuar?`,
      icon: 'pi pi-download',
      acceptLabel: 'Instalar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.installing.add(module.key);
        this.organizationsApi
          .installModule(this.organizationId!, module.key)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (response) => {
              const installed = response.result?.installedKeys ?? [];
              const alreadyInstalled = response.result?.alreadyInstalledKeys ?? [];
              const dependencyCount = installed.filter((key) => key !== module.key).length;
              this.messageService.add({
                severity: 'success',
                summary: 'Instalacion completada',
                detail: `Instalados: ${installed.length}. Dependencias instaladas: ${dependencyCount}. Ya instalados: ${alreadyInstalled.length}.`,
              });
              this.installing.delete(module.key);
              this.reloadModules();
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
      },
    });
  }

  uninstallModule(module: OrganizationModuleStoreItem): void {
    if (!this.organizationId || !module.installed || this.isUninstalling(module.key)) {
      return;
    }

    this.confirmationService.confirm({
      header: 'Desinstalar modulo',
      message: `¿Deseas desinstalar ${module.name}?`,
      icon: 'pi pi-trash',
      acceptLabel: 'Desinstalar',
      rejectLabel: 'Cancelar',
      accept: () => this.performUninstall(module, false),
    });
  }

  completeSetup(): void {
    if (!this.organizationId || !this.isOwner || this.organization?.setupStatus === 'completed') {
      return;
    }

    this.organizationsApi
      .markSetupCompleted(this.organizationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (this.organization) {
            this.organization.setupStatus = 'completed';
          }
          this.messageService.add({
            severity: 'success',
            summary: 'Configuracion completa',
            detail: 'La organizacion quedo marcada como configurada.',
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo completar la configuracion.',
          });
        },
      });
  }

  private performUninstall(module: OrganizationModuleStoreItem, cascade: boolean): void {
    if (!this.organizationId) {
      return;
    }

    this.uninstalling.add(module.key);
    this.organizationsApi
      .uninstallModule(this.organizationId, module.key, cascade)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const uninstalled = response.result?.uninstalledKeys ?? [];
          this.messageService.add({
            severity: 'success',
            summary: 'Modulo desinstalado',
            detail: `Desinstalados: ${uninstalled.length}.`,
          });
          this.uninstalling.delete(module.key);
          this.reloadModules();
        },
        error: (error: HttpErrorResponse) => {
          this.uninstalling.delete(module.key);
          if (error.status === 409 && error.error?.dependents?.length) {
            this.confirmationService.confirm({
              header: 'Dependencias encontradas',
              message: `El modulo es requerido por: ${error.error.dependents.join(', ')}. ¿Desinstalar en cascada?`,
              icon: 'pi pi-exclamation-triangle',
              acceptLabel: 'Desinstalar en cascada',
              rejectLabel: 'Cancelar',
              accept: () => this.performUninstall(module, true),
            });
            return;
          }
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo desinstalar el modulo.',
          });
        },
      });
  }

  private reloadModules(): void {
    const orgId = this.organizationId;
    if (orgId) {
      this.loadModules(orgId);
    }
  }

  retryLoad(): void {
    const orgId = this.organizationId;
    if (orgId) {
      this.loadModules(orgId);
    }
  }

  private loadModules(organizationId: string): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.organizationsApi
      .getModulesStore(organizationId)
      .pipe(
        timeout(8000),
        finalize(() => {
          this.isLoading = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          if (environment.debugLogs) {
            // eslint-disable-next-line no-console
            console.debug('[ModuleStore] modules store response', response);
          }
          this.modules = this.normalizeModules(response);
          if (environment.debugLogs) {
            // eslint-disable-next-line no-console
            console.debug('[ModuleStore] available length', this.modules.length);
          }
          if (environment.debugLogs && this.modules.length === 0) {
            // eslint-disable-next-line no-console
            console.debug('[ModuleStore] no installable modules returned', response?.result);
          }
        },
        error: () => {
          this.modules = [];
          this.errorMessage = 'No se pudo cargar modulos instalables.';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los modulos instalables.',
          });
        },
      });
  }

  private normalizeModules(response: { result?: OrganizationModuleStoreResponse }): OrganizationModuleStoreItem[] {
    const available = response.result?.available ?? [];
    return available.map((module) => ({
      ...module,
      name: module.name?.trim() || module.key,
      version: module.version?.trim() || '1.0.0',
      dependencies: Array.isArray(module.dependencies) ? module.dependencies : [],
      installed: Boolean(module.installed),
    }));
  }

  private loadOrganization(organizationId: string): void {
    this.organizationsApi
      .getById(organizationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const organization = response.result ?? null;
          this.organization = organization;
          const user = this.authService.getCurrentUser();
          const userId = user?.id ?? null;
          this.isOwner =
            Boolean(organization?.ownerUserId && organization.ownerUserId === userId) ||
            (organization?.members ?? []).some((member) => member.userId === userId && member.roleKey === 'owner');
        },
        error: () => {
          this.organization = null;
          this.isOwner = false;
        },
      });
  }
}
