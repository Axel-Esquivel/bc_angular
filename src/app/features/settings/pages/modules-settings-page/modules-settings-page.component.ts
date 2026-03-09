import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { finalize, take } from 'rxjs';

import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { OrganizationModuleOverviewItem } from '../../../../shared/models/organization-modules.model';
import { PriceListsService } from '../../../price-lists/services/price-lists.service';
import { PriceList } from '../../../price-lists/models/price-list.model';

interface SelectOption {
  label: string;
  value: string | null;
}

interface PriceListsModuleSettings {
  defaultByCompanyId?: Record<string, string | null>;
}

interface ProductsSettingsForm {
  enableVariants: boolean;
  autoGenerateSku: boolean;
  allowMultipleBarcodes: boolean;
}

@Component({
  standalone: false,
  selector: 'app-modules-settings-page',
  templateUrl: './modules-settings-page.component.html',
  styleUrls: ['./modules-settings-page.component.scss'],
  providers: [MessageService],
})
export class ModulesSettingsPageComponent implements OnInit {
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly priceListsService = inject(PriceListsService);

  modules: OrganizationModuleOverviewItem[] = [];
  loading = false;
  selectedKey: string | null = null;
  saving = false;
  contextMissing = false;
  priceListsLoading = false;
  priceListOptions: SelectOption[] = [];
  priceListsContextMissing = false;

  readonly productsForm = this.fb.nonNullable.group({
    enableVariants: [false],
    autoGenerateSku: [true],
    allowMultipleBarcodes: [false],
  });

  readonly priceListsForm = this.fb.group({
    defaultPriceListId: new FormControl<string | null>(null),
  });

  readonly eanPrefixForm = this.fb.nonNullable.group({
    eanPrefix: [''],
  });

  ngOnInit(): void {
    this.loadModules();
  }

  selectModule(moduleKey: string): void {
    this.selectedKey = moduleKey;
    if (moduleKey === 'products') {
      this.loadProductsSettings();
      this.loadEanPrefix();
    }
    if (moduleKey === 'price-lists') {
      this.loadPriceListsSettings();
      this.loadPriceListsOptions();
    }
  }

  saveProductsSettings(): void {
    const organizationId = this.getOrganizationId();
    if (!organizationId) {
      this.contextMissing = true;
      return;
    }
    this.saving = true;
    const payload: ProductsSettingsForm = this.productsForm.getRawValue();
    const settings = {
      enableVariants: payload.enableVariants,
      autoGenerateSku: payload.autoGenerateSku,
      allowMultipleBarcodes: payload.allowMultipleBarcodes,
    };
    this.organizationsApi
      .updateModuleSettings(organizationId, {
        moduleKey: 'products',
        settings,
      })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.saving = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Configuraci?n',
            detail: 'Ajustes guardados.',
          });
        },
        error: () => {
          this.saving = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Configuraci?n',
            detail: 'No se pudieron guardar los ajustes.',
          });
        },
      });
  }

  savePriceListsSettings(): void {
    const organizationId = this.getOrganizationId();
    const companyId = this.getCompanyId();
    if (!organizationId || !companyId) {
      this.priceListsContextMissing = true;
      return;
    }
    this.priceListsContextMissing = false;
    this.saving = true;
    const defaultPriceListId = this.priceListsForm.controls.defaultPriceListId.value ?? null;
    this.organizationsApi
      .updateModuleSettings(organizationId, {
        moduleKey: 'price-lists',
        settings: {
          companyId,
          defaultPriceListId,
        },
      })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.saving = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Configuración',
            detail: 'Lista de precios por defecto guardada.',
          });
        },
        error: () => {
          this.saving = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Configuración',
            detail: 'No se pudo guardar la lista por defecto.',
          });
        },
      });
  }

  saveEanPrefix(): void {
    const organizationId = this.getOrganizationId();
    if (!organizationId) {
      this.contextMissing = true;
      return;
    }
    const raw = this.eanPrefixForm.getRawValue();
    const eanPrefix = raw.eanPrefix.trim();
    if (!/^\d{3,7}$/.test(eanPrefix)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Configuración',
        detail: 'El prefijo EAN debe tener 3 a 7 dígitos numéricos.',
      });
      return;
    }
    this.saving = true;
    this.organizationsApi
      .updateEanPrefix(organizationId, eanPrefix)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const updated = response.result?.eanPrefix ?? eanPrefix;
          this.eanPrefixForm.patchValue({ eanPrefix: updated });
          this.saving = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Configuración',
            detail: 'Prefijo EAN actualizado.',
          });
        },
        error: () => {
          this.saving = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Configuración',
            detail: 'No se pudo actualizar el prefijo EAN.',
          });
        },
      });
  }

  private loadModules(): void {
    const organizationId = this.getOrganizationId();
    if (!organizationId) {
      this.contextMissing = true;
      this.modules = [];
      return;
    }
    this.contextMissing = false;
    this.loading = true;
    this.organizationsApi
      .getModulesOverview(organizationId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.modules = response.result?.modules ?? [];
          this.loading = false;
        },
        error: () => {
          this.modules = [];
          this.loading = false;
        },
      });
  }

  private loadProductsSettings(): void {
    const organizationId = this.getOrganizationId();
    if (!organizationId) {
      this.contextMissing = true;
      return;
    }
    this.organizationsApi
      .getById(organizationId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const settings = response.result?.moduleSettings?.['products'];
          if (this.isProductsSettings(settings)) {
            this.productsForm.patchValue({
              enableVariants: settings.enableVariants ?? false,
              autoGenerateSku: settings.autoGenerateSku ?? true,
              allowMultipleBarcodes: settings.allowMultipleBarcodes ?? false,
            });
          }
        },
        error: () => undefined,
      });
  }

  private loadPriceListsSettings(): void {
    const organizationId = this.getOrganizationId();
    const companyId = this.getCompanyId();
    if (!organizationId || !companyId) {
      this.priceListsContextMissing = true;
      this.priceListsForm.reset({ defaultPriceListId: null }, { emitEvent: false });
      return;
    }
    this.priceListsContextMissing = false;
    this.organizationsApi
      .getById(organizationId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const settings = response.result?.moduleSettings?.['price-lists'];
          const current = this.getDefaultPriceListId(settings, companyId);
          this.priceListsForm.patchValue({ defaultPriceListId: current ?? null }, { emitEvent: false });
        },
        error: () => undefined,
      });
  }

  private loadPriceListsOptions(): void {
    const organizationId = this.getOrganizationId();
    const companyId = this.getCompanyId();
    if (!organizationId || !companyId) {
      this.priceListOptions = [];
      return;
    }
    this.priceListsLoading = true;
    this.priceListsService
      .list()
      .pipe(
        take(1),
        finalize(() => {
          this.priceListsLoading = false;
        }),
      )
      .subscribe({
        next: (response) => {
          const lists = (response.result ?? []).filter(
            (item) => item.OrganizationId === organizationId && item.companyId === companyId,
          );
          this.priceListOptions = this.buildPriceListOptions(lists);
        },
        error: () => {
          this.priceListOptions = [];
        },
      });
  }

  private loadEanPrefix(): void {
    const organizationId = this.getOrganizationId();
    if (!organizationId) {
      return;
    }
    this.organizationsApi
      .getEanPrefix(organizationId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const prefix = response.result?.eanPrefix ?? '';
          this.eanPrefixForm.patchValue({ eanPrefix: prefix });
        },
        error: () => undefined,
      });
  }

  private getOrganizationId(): string | null {
    const context = this.activeContextState.getActiveContext();
    return context.organizationId ?? null;
  }

  private getCompanyId(): string | null {
    const context = this.activeContextState.getActiveContext();
    return context.companyId ?? null;
  }

  private getDefaultPriceListId(value: unknown, companyId: string): string | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const settings = value as PriceListsModuleSettings;
    const map = settings.defaultByCompanyId ?? {};
    const current = map[companyId] ?? null;
    return typeof current === 'string' && current.trim() ? current.trim() : null;
  }

  private buildPriceListOptions(lists: PriceList[]): SelectOption[] {
    return lists.map((item) => ({
      label: item.name ?? item.id,
      value: item.id,
    }));
  }

  private isProductsSettings(
    value: unknown,
  ): value is { enableVariants?: boolean; autoGenerateSku?: boolean; allowMultipleBarcodes?: boolean } {
    return typeof value === 'object' && value !== null;
  }

  isModuleEnabled(modules: OrganizationModuleOverviewItem[], key: string): boolean {
    const module = modules.find((item) => item.key === key);
    return Boolean(module && module.state?.status !== 'disabled');
  }
}
