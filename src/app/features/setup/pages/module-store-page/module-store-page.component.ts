import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Tag } from 'primeng/tag';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { MultiSelect } from 'primeng/multiselect';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { FormsModule } from '@angular/forms';
import { finalize, map, distinctUntilChanged, timeout } from 'rxjs';

import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import {
  OrganizationModuleStoreItem,
  OrganizationModuleStoreResponse,
  SuiteOperationResponse,
} from '../../../../shared/models/organization-module-store.model';
import { environment } from '../../../../../environments/environment';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../../core/auth/auth.service';
import { IOrganization } from '../../../../shared/models/organization.model';
import { ModuleCardComponent } from '../../components/module-card/module-card.component';
import { applyModuleUiMeta, ModuleVisibility } from '../../utils/module-classification';

type GroupBy = 'suite' | 'category' | 'none';
type SortBy = 'name' | 'status' | 'order';
type GroupType = 'type';

interface SelectOption<T = string> {
  label: string;
  value: T;
}

const SUITE_LABELS: Record<string, string> = {
  'inventory-suite': 'Inventario',
  'master-data-suite': 'Datos Maestros',
  'pos-suite': 'Punto de Venta',
  'utilities-suite': 'Utilidades',
};

@Component({
  selector: 'app-module-store-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    Card,
    Tag,
    InputText,
    Select,
    MultiSelect,
    ToggleSwitchModule,
    ConfirmDialog,
    ModuleCardComponent,
  ],
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  modules: OrganizationModuleStoreItem[] = [];
  visibleModules: OrganizationModuleStoreItem[] = [];
  groupedModules: Record<string, OrganizationModuleStoreItem[]> = {};
  groupedKeys: string[] = [];
  isLoading = false;
  organizationId: string | null = null;
  organization: IOrganization | null = null;
  isOwner = false;
  errorMessage: string | null = null;
  returnUrl: string | null = null;
  searchText = '';
  groupBy: GroupBy | GroupType = 'suite';
  sortBy: SortBy = 'order';
  selectedCategories: string[] = [];
  showInternal = false;
  categoryOptions: Array<SelectOption> = [];
  readonly groupByOptions: Array<SelectOption<GroupBy | GroupType>> = [
    { label: 'Suite', value: 'suite' },
    { label: 'Categoria', value: 'category' },
    { label: 'Tipo (Apps / Internos)', value: 'type' },
    { label: 'Sin agrupar', value: 'none' },
  ];
  readonly sortByOptions: Array<SelectOption<SortBy>> = [
    { label: 'Nombre', value: 'name' },
    { label: 'Estado', value: 'status' },
    { label: 'Orden', value: 'order' },
  ];
  private readonly installing = new Set<string>();
  private readonly uninstalling = new Set<string>();
  private readonly installingSuites = new Set<string>();
  private readonly uninstallingSuites = new Set<string>();
  private readonly collapsedGroups = new Set<string>();

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        map((params) => params.get('returnUrl')),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((returnUrl) => {
        this.returnUrl = this.normalizeReturnUrl(returnUrl);
      });

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
        this.visibleModules = [];
        this.groupedModules = {};
        this.groupedKeys = [];
        return;
      }
      this.loadOrganization(organizationId);
      this.loadModules(organizationId);
      });
  }

  goBack(): void {
    if (!this.returnUrl) {
      return;
    }
    void this.router.navigateByUrl(this.returnUrl);
  }

  isInstalling(moduleKey: string): boolean {
    return this.installing.has(moduleKey);
  }

  isUninstalling(moduleKey: string): boolean {
    return this.uninstalling.has(moduleKey);
  }

  isSuiteInstalling(suiteKey: string): boolean {
    return this.installingSuites.has(suiteKey);
  }

  isSuiteUninstalling(suiteKey: string): boolean {
    return this.uninstallingSuites.has(suiteKey);
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
            error: (error: HttpErrorResponse) => {
              this.installing.delete(module.key);
              const detail = this.buildErrorMessage(error) ?? 'No se pudo instalar el modulo.';
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail,
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

  installSuite(suiteKey: string): void {
    if (!this.organizationId || this.isSuiteInstalling(suiteKey)) {
      return;
    }
    const suiteModules = this.getSuiteModules(suiteKey);
    if (suiteModules.length === 0) {
      return;
    }

    this.confirmationService.confirm({
      header: 'Instalar suite',
      message: `Se instalaran ${suiteModules.length} modulos de la suite ${suiteKey}. ¿Continuar?`,
      icon: 'pi pi-download',
      acceptLabel: 'Instalar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.installingSuites.add(suiteKey);
        this.organizationsApi
          .installSuite(this.organizationId!, suiteKey)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (response) => {
              this.installingSuites.delete(suiteKey);
              this.handleSuiteResult('Instalacion de suite', response.result);
              this.reloadModules();
            },
            error: (error: HttpErrorResponse) => {
              this.installingSuites.delete(suiteKey);
              const detail = this.buildErrorMessage(error) ?? 'No se pudo instalar la suite.';
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail,
              });
            },
          });
      },
    });
  }

  uninstallSuite(suiteKey: string): void {
    if (!this.organizationId || this.isSuiteUninstalling(suiteKey)) {
      return;
    }
    const suiteModules = this.getSuiteModules(suiteKey);
    if (suiteModules.length === 0) {
      return;
    }

    this.confirmationService.confirm({
      header: 'Desinstalar suite',
      message: `Se intentara desinstalar la suite ${suiteKey}. ¿Continuar?`,
      icon: 'pi pi-trash',
      acceptLabel: 'Desinstalar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.uninstallingSuites.add(suiteKey);
        this.organizationsApi
          .uninstallSuite(this.organizationId!, suiteKey)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (response) => {
              this.uninstallingSuites.delete(suiteKey);
              this.handleSuiteResult('Desinstalacion de suite', response.result);
              this.reloadModules();
            },
            error: (error: HttpErrorResponse) => {
              this.uninstallingSuites.delete(suiteKey);
              const detail = this.buildErrorMessage(error) ?? 'No se pudo desinstalar la suite.';
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail,
              });
            },
          });
      },
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
          this.router.navigateByUrl('/app');
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
          const detail = this.buildErrorMessage(error) ?? 'No se pudo desinstalar el modulo.';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail,
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

  onToolbarChange(): void {
    this.updateView();
  }

  hasVisibleModules(): boolean {
    if (this.groupBy === 'none') {
      return this.visibleModules.length > 0;
    }
    return this.groupedKeys.length > 0;
  }

  toggleGroup(groupKey: string): void {
    if (this.collapsedGroups.has(groupKey)) {
      this.collapsedGroups.delete(groupKey);
    } else {
      this.collapsedGroups.add(groupKey);
    }
  }

  isGroupCollapsed(groupKey: string): boolean {
    return this.collapsedGroups.has(groupKey);
  }

  trackByKey(_: number, module: OrganizationModuleStoreItem): string {
    return module.key;
  }

  getGroupLabel(groupKey: string): string {
    if (this.groupBy === 'suite') {
      return SUITE_LABELS[groupKey] ?? groupKey;
    }
    if (this.groupBy === 'category') {
      return groupKey;
    }
    return groupKey;
  }

  getGroupInstalledCount(groupKey: string): number {
    return this.getGroupModules(groupKey).filter((module) => module.installed).length;
  }

  getGroupTotalCount(groupKey: string): number {
    return this.getGroupModules(groupKey).length;
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
          this.categoryOptions = this.buildCategoryOptions(this.modules);
          this.updateView();
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
          this.visibleModules = [];
          this.groupedModules = {};
          this.groupedKeys = [];
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
    return available.map((module) =>
      applyModuleUiMeta({
        ...module,
        name: module.name?.trim() || module.key,
        version: module.version?.trim() || '1.0.0',
        dependencies: Array.isArray(module.dependencies) ? module.dependencies : [],
        category: module.category?.trim() || 'utilities',
        suite: module.suite?.trim() || 'utilities-suite',
        tags: Array.isArray(module.tags)
          ? module.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)
          : [],
        order: typeof module.order === 'number' ? module.order : 100,
        installed: Boolean(module.installed),
        visibility: module.visibility,
      })
    );
  }

  private updateView(): void {
    const filtered = this.filterModules(this.modules, this.searchText, this.selectedCategories, this.showInternal);
    const sorted = this.sortModules(filtered, this.sortBy);
    if (this.groupBy === 'none') {
      this.visibleModules = sorted;
      this.groupedModules = {};
      this.groupedKeys = [];
      return;
    }
    const grouped = this.groupModules(sorted, this.groupBy);
    this.groupedModules = grouped;
    this.groupedKeys =
      this.groupBy === 'type'
        ? (['Apps', 'Internos'] as string[]).filter((key) => grouped[key]?.length)
        : Object.keys(grouped).sort((a, b) => a.localeCompare(b));
    this.collapsedGroups.forEach((key) => {
      if (!this.groupedModules[key]) {
        this.collapsedGroups.delete(key);
      }
    });
    this.visibleModules = [];
  }

  private getGroupModules(groupKey: string): OrganizationModuleStoreItem[] {
    return this.groupedModules[groupKey] ?? [];
  }

  private getSuiteModules(suiteKey: string): OrganizationModuleStoreItem[] {
    return this.modules.filter((module) => module.suite === suiteKey);
  }

  canInstallSuite(suiteKey: string): boolean {
    return this.getSuiteModules(suiteKey).some((module) => !module.installed);
  }

  canUninstallSuite(suiteKey: string): boolean {
    return this.getSuiteModules(suiteKey).some((module) => module.installed);
  }

  private filterModules(
    modules: OrganizationModuleStoreItem[],
    searchText: string,
    selectedCategories: string[],
    showInternal: boolean,
  ): OrganizationModuleStoreItem[] {
    const normalizedSearch = searchText.trim().toLowerCase();
    const hasSearch = normalizedSearch.length > 0;
    const categorySet = new Set(selectedCategories.map((category) => category.toLowerCase()));
    const hasCategories = categorySet.size > 0;

    return modules.filter((module) => {
      if (!showInternal && module.visibility === 'internal') {
        return false;
      }
      if (hasCategories && !categorySet.has(module.category.toLowerCase())) {
        return false;
      }
      if (!hasSearch) {
        return true;
      }
      const haystack = [
        module.key,
        module.name,
        module.description ?? '',
        module.category,
        module.suite,
        ...module.tags,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }

  private sortModules(modules: OrganizationModuleStoreItem[], sortBy: SortBy): OrganizationModuleStoreItem[] {
    const sorted = [...modules];
    sorted.sort((a, b) => {
      const installedDiff = Number(b.installed) - Number(a.installed);
      if (installedDiff !== 0) {
        return installedDiff;
      }

      if (sortBy === 'name') {
        const nameDiff = a.name.localeCompare(b.name);
        if (nameDiff !== 0) {
          return nameDiff;
        }
        return a.order - b.order;
      }

      if (sortBy === 'order') {
        const orderDiff = a.order - b.order;
        if (orderDiff !== 0) {
          return orderDiff;
        }
        return a.name.localeCompare(b.name);
      }

      const orderDiff = a.order - b.order;
      if (orderDiff !== 0) {
        return orderDiff;
      }
      return a.name.localeCompare(b.name);
    });
    return sorted;
  }

  private groupModules(
    modules: OrganizationModuleStoreItem[],
    groupBy: Exclude<GroupBy | GroupType, 'none'>,
  ): Record<string, OrganizationModuleStoreItem[]> {
    return modules.reduce<Record<string, OrganizationModuleStoreItem[]>>((acc, module) => {
      const key =
        groupBy === 'suite'
          ? module.suite
          : groupBy === 'category'
          ? module.category
          : module.visibility === 'internal'
          ? 'Internos'
          : 'Apps';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(module);
      return acc;
    }, {});
  }

  private buildCategoryOptions(modules: OrganizationModuleStoreItem[]): Array<SelectOption> {
    const categories = Array.from(new Set(modules.map((module) => module.category))).sort((a, b) =>
      a.localeCompare(b),
    );
    return categories.map((category) => ({ label: category, value: category }));
  }

  private handleSuiteResult(label: string, result?: SuiteOperationResponse): void {
    if (!result) {
      this.messageService.add({
        severity: 'info',
        summary: label,
        detail: 'No hubo cambios.',
      });
      return;
    }

    if (result.errors.length > 0) {
      const errorSummary = result.errors.map((item) => `${item.key}: ${item.message}`).join(' | ');
      this.messageService.add({
        severity: 'warn',
        summary: label,
        detail: errorSummary,
      });
    }

    if (result.blockers.length > 0) {
      this.messageService.add({
        severity: 'warn',
        summary: label,
        detail: `Bloqueantes: ${result.blockers.join(', ')}`,
      });
    }

    this.messageService.add({
      severity: 'success',
      summary: label,
      detail: `Instalados: ${result.installed.length}. Omitidos: ${result.skipped.length}.`,
    });
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

  private normalizeReturnUrl(value: string | null): string | null {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed.startsWith('/app')) {
      return null;
    }
    return trimmed;
  }

  private buildErrorMessage(error: HttpErrorResponse): string | null {
    const apiMessage = error.error?.message;
    if (Array.isArray(apiMessage)) {
      return apiMessage.join(', ');
    }
    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage;
    }
    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }
    return null;
  }
}
