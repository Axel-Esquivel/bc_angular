import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { take } from 'rxjs';

import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { OrganizationModuleOverviewItem } from '../../../../shared/models/organization-modules.model';

interface ProductsSettingsForm {
  enableVariants: boolean;
  autoGenerateSku: boolean;
  allowMultipleBarcodes: boolean;
}

@Component({
  selector: 'app-modules-settings-page',
  templateUrl: './modules-settings-page.component.html',
  styleUrl: './modules-settings-page.component.scss',
  providers: [MessageService],
})
export class ModulesSettingsPageComponent implements OnInit {
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);

  modules: OrganizationModuleOverviewItem[] = [];
  loading = false;
  selectedKey: string | null = null;
  saving = false;
  contextMissing = false;

  readonly productsForm = this.fb.nonNullable.group({
    enableVariants: [false],
    autoGenerateSku: [true],
    allowMultipleBarcodes: [false],
  });

  ngOnInit(): void {
    this.loadModules();
  }

  selectModule(moduleKey: string): void {
    this.selectedKey = moduleKey;
    if (moduleKey === 'products') {
      this.loadProductsSettings();
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
            summary: 'ConfiguraciÃ³n',
            detail: 'Ajustes guardados.',
          });
        },
        error: () => {
          this.saving = false;
          this.messageService.add({
            severity: 'error',
            summary: 'ConfiguraciÃ³n',
            detail: 'No se pudieron guardar los ajustes.',
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

  private getOrganizationId(): string | null {
    const context = this.activeContextState.getActiveContext();
    return context.organizationId ?? null;
  }

  private isProductsSettings(
    value: unknown,
  ): value is { enableVariants?: boolean; autoGenerateSku?: boolean; allowMultipleBarcodes?: boolean } {
    return typeof value === 'object' && value !== null;
  }
}
