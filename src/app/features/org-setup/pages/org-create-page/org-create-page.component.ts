import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Dialog } from 'primeng/dialog';
import { FloatLabel } from 'primeng/floatlabel';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { StepperModule } from 'primeng/stepper';

import { OrgSetupComponentsModule } from '../../components/org-setup-components.module';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { SessionStateService } from '../../../../core/services/session-state.service';
import { take } from 'rxjs/operators';
import { OrganizationCoreApiService } from '../../../../core/api/organization-core-api.service';
import { CompaniesApiService } from '../../../../core/api/companies-api.service';
import { BranchesApiService } from '../../../../core/api/branches-api.service';
import { CoreCountry, CoreCurrency, OrganizationCoreSettings } from '../../../../shared/models/organization-core.model';
import { Company } from '../../../../shared/models/company.model';
import { Branch, BranchType } from '../../../../shared/models/branch.model';

type EditableCountry = { id: string; name: string; code?: string };
type EditableCurrency = { id: string; name: string; code?: string; symbol?: string };

@Component({
  selector: 'app-org-create-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Button,
    Card,
    ConfirmDialog,
    Dialog,
    FloatLabel,
    InputText,
    Select,
    StepperModule,
    OrgSetupComponentsModule,
  ],
  templateUrl: './org-create-page.component.html',
  styleUrl: './org-create-page.component.scss',
  providers: [ConfirmationService],
})
export class OrgCreatePageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly organizationCoreApi = inject(OrganizationCoreApiService);
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly branchesApi = inject(BranchesApiService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly sessionState = inject(SessionStateService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  @Input() organizationId?: string;
  @Input() startStep = 1;
  @Input() managePending = true;
  @Input() navigateOnComplete = true;
  @Input() visibleInDialog = false;
  @Input() mode: 'page' | 'dialog' = 'page';
  @Input() existingOrganizations: Array<{ id: string; name: string }> = [];

  @Output() cancelled = new EventEmitter<void>();
  @Output() completed = new EventEmitter<{ organizationId: string }>();
  @Output() organizationCreated = new EventEmitter<{ organizationId: string }>();
  @Output() stepChanged = new EventEmitter<number>();

  private _activeStep = 1;
  createdOrganizationId: string | null = null;
  pendingStartedAt: string | null = null;

  isSubmittingOrg = false;
  step1Valid = false;
  step2Ready = false;
  step3Ready = false;
  step4Ready = false;

  step2RefreshToken = 0;
  step3RefreshToken = 0;
  step4RefreshToken = 0;

  editCountryDialogOpen = false;
  editCurrencyDialogOpen = false;
  editCompanyDialogOpen = false;
  editBranchDialogOpen = false;

  editingCountry: EditableCountry | null = null;
  editingCurrency: EditableCurrency | null = null;
  editingCompany: Company | null = null;
  editingBranch: Branch | null = null;

  readonly editCountryForm = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    code: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(3)]),
  });

  readonly editCurrencyForm = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    code: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(4)]),
    symbol: this.fb.control<string | null>(null),
  });

  readonly editCompanyForm = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
  });

  readonly editBranchForm = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    type: this.fb.nonNullable.control<BranchType>('retail', [Validators.required]),
  });

  get activeStep(): number {
    return this._activeStep;
  }

  set activeStep(value: number) {
    this._activeStep = value;
    this.stepChanged.emit(this._activeStep);
    if (this.managePending) {
      this.persistPendingSetup();
    }
  }

  ngOnInit(): void {
    const pending = this.sessionState.getPendingOrgSetup();
    if (this.organizationId) {
      this.createdOrganizationId = this.organizationId;
      this._activeStep = this.normalizeStep(this.startStep);
      return;
    }
    if (pending && this.sessionState.isAuthenticated()) {
      this.createdOrganizationId = pending.organizationId;
      this.pendingStartedAt = pending.startedAt;
      this._activeStep = this.normalizeStep(pending.lastStep);
      return;
    }
    this._activeStep = this.normalizeStep(this.startStep);
  }

  onStep1ValidChange(isValid: boolean): void {
    this.step1Valid = isValid;
  }

  onOrganizationCreated(organizationId: string): void {
    this.isSubmittingOrg = false;
    if (!organizationId) {
      return;
    }
    this.createdOrganizationId = organizationId;
    this.pendingStartedAt = new Date().toISOString();
    this.organizationCreated.emit({ organizationId });
    this.step2Ready = false;
    this.step3Ready = false;
    this.step4Ready = false;
    this.verifyAndAdvanceToStep2(organizationId);
  }

  onStep2ReadyChange(ready: boolean): void {
    this.step2Ready = ready;
  }

  onStep3ReadyChange(ready: boolean): void {
    this.step3Ready = ready;
  }

  onStep4Finished(): void {
    this.step4Ready = true;
  }

  onEditCountry(country: EditableCountry): void {
    if (!country?.id) {
      return;
    }
    this.editingCountry = country;
    this.editCountryForm.reset({
      name: country.name,
      code: country.code ?? '',
    });
    this.editCountryDialogOpen = true;
  }

  onDeleteCountry(country: EditableCountry): void {
    if (!country?.id) {
      return;
    }
    this.confirmationService.confirm({
      header: "Eliminar pais",
      message: "Deseas eliminar este pais?",
      acceptLabel: "Eliminar",
      rejectLabel: "Cancelar",
      accept: () => {
        this.updateCoreSettings({
          countries: (settings) => settings.countries.filter((item) => item.id !== country.id),
        });
      },
    });
  }

  onEditCurrency(currency: EditableCurrency): void {
    if (!currency?.id) {
      return;
    }
    this.editingCurrency = currency;
    this.editCurrencyForm.reset({
      name: currency.name,
      code: currency.code ?? '',
      symbol: currency.symbol ?? null,
    });
    this.editCurrencyDialogOpen = true;
  }

  onDeleteCurrency(currency: EditableCurrency): void {
    if (!currency?.id) {
      return;
    }
    this.confirmationService.confirm({
      header: "Eliminar moneda",
      message: "Deseas eliminar esta moneda?",
      acceptLabel: "Eliminar",
      rejectLabel: "Cancelar",
      accept: () => {
        this.updateCoreSettings({
          currencies: (settings) => settings.currencies.filter((item) => item.id !== currency.id),
        });
      },
    });
  }

  onEditCompany(company: Company): void {
    if (!company?.id) {
      return;
    }
    this.editingCompany = company;
    this.editCompanyForm.reset({
      name: company.name ?? "",
    });
    this.editCompanyDialogOpen = true;
  }

  onDeleteCompany(company: Company): void {
    if (!company?.id) {
      return;
    }
    this.confirmationService.confirm({
      header: "Eliminar compania",
      message: "Deseas eliminar esta compania? Esta accion no esta disponible por el momento.",
      acceptLabel: "Entendido",
      rejectLabel: "Cancelar",
      accept: () => {
        this.messageService.add({
          severity: "info",
          summary: "Compania",
          detail: "Eliminacion no disponible por el momento.",
        });
      },
    });
  }

  onEditBranch(branch: Branch): void {
    if (!branch?.id) {
      return;
    }
    this.editingBranch = branch;
    this.editBranchForm.reset({
      name: branch.name ?? "",
      type: branch.type ?? "retail",
    });
    this.editBranchDialogOpen = true;
  }

  onDeleteBranch(branch: Branch): void {
    if (!branch?.id) {
      return;
    }
    this.confirmationService.confirm({
      header: "Eliminar empresa",
      message: "Deseas eliminar esta empresa? Esta accion no esta disponible por el momento.",
      acceptLabel: "Entendido",
      rejectLabel: "Cancelar",
      accept: () => {
        this.messageService.add({
          severity: "info",
          summary: "Empresa",
          detail: "Eliminacion no disponible por el momento.",
        });
      },
    });
  }
  saveCountryEdit(): void {
    if (!this.editingCountry?.id || this.editCountryForm.invalid) {
      this.editCountryForm.markAllAsTouched();
      return;
    }
    const { name, code } = this.editCountryForm.getRawValue();
    this.updateCoreSettings({
      countries: (settings) =>
        settings.countries.map((item) =>
          item.id === this.editingCountry?.id
            ? { ...item, name: name.trim(), code: code.trim().toUpperCase() }
            : item,
        ),
    });
    this.editCountryDialogOpen = false;
  }

  saveCurrencyEdit(): void {
    if (!this.editingCurrency?.id || this.editCurrencyForm.invalid) {
      this.editCurrencyForm.markAllAsTouched();
      return;
    }
    const { name, code, symbol } = this.editCurrencyForm.getRawValue();
    this.updateCoreSettings({
      currencies: (settings) =>
        settings.currencies.map((item) =>
          item.id === this.editingCurrency?.id
            ? { ...item, name: name.trim(), code: code.trim().toUpperCase(), symbol: symbol ?? undefined }
            : item,
        ),
    });
    this.editCurrencyDialogOpen = false;
  }

  saveCompanyEdit(): void {
    if (!this.editingCompany?.id || this.editCompanyForm.invalid) {
      this.editCompanyForm.markAllAsTouched();
      return;
    }
    const name = this.editCompanyForm.getRawValue().name.trim();
    this.companiesApi
      .update(this.editingCompany.id, { name })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Compania actualizada.' });
          this.editCompanyDialogOpen = false;
          this.step3RefreshToken += 1;
          this.step4RefreshToken += 1;
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar la compania.' });
        },
      });
  }

  saveBranchEdit(): void {
    if (!this.editingBranch?.id || this.editBranchForm.invalid) {
      this.editBranchForm.markAllAsTouched();
      return;
    }
    const { name, type } = this.editBranchForm.getRawValue();
    this.branchesApi
      .update(this.editingBranch.id, { name: name.trim(), type })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Empresa actualizada.' });
          this.editBranchDialogOpen = false;
          this.step4RefreshToken += 1;
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar la empresa.' });
        },
      });
  }

  private updateCoreSettings(update: {
    countries?: (settings: OrganizationCoreSettings) => CoreCountry[];
    currencies?: (settings: OrganizationCoreSettings) => CoreCurrency[];
  }): void {
    if (!this.createdOrganizationId) {
      return;
    }
    this.organizationCoreApi
      .getCoreSettings(this.createdOrganizationId)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const settings = response?.result;
          if (!settings) {
            return;
          }
          const payload: { countries?: CoreCountry[]; currencies?: CoreCurrency[] } = {};
          if (update.countries) {
            payload.countries = update.countries(settings);
          }
          if (update.currencies) {
            payload.currencies = update.currencies(settings);
          }
          this.organizationCoreApi
            .updateCoreSettings(this.createdOrganizationId ?? '', payload)
            .pipe(take(1))
            .subscribe({
              next: () => {
                this.messageService.add({ severity: 'success', summary: 'Listo', detail: 'Datos actualizados.' });
                this.step2RefreshToken += 1;
              },
              error: () => {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'No se pudieron actualizar los datos.',
                });
              },
            });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los datos.',
          });
        },
      });
  }

  goBack(): void {
    if (this.activeStep > 1) {
      this.activeStep -= 1;
    }
  }

  goNext(): void {
    if (this.activeStep === 1) {
      if (!this.step1Valid || this.isSubmittingOrg) {
        return;
      }
      this.isSubmittingOrg = true;
      return;
    }

    if (this.activeStep === 2 && !this.step2Ready) {
      return;
    }

    if (this.activeStep === 3 && !this.step3Ready) {
      return;
    }

    if (this.activeStep < 4) {
      this.activeStep += 1;
    }
  }

  onStepperValueChange(next: number | undefined): void {
    if (typeof next !== 'number') {
      return;
    }
    if (this.canActivateStep(next)) {
      this.activeStep = next;
    }
  }

  canActivateStep(step: number): boolean {
    return step <= this.maxEnabledStep;
  }

  get maxEnabledStep(): number {
    let max = 1;
    if (this.step1Valid && this.createdOrganizationId) {
      max = 2;
    }
    if (this.step2Ready) {
      max = 3;
    }
    if (this.step3Ready) {
      max = 4;
    }
    return Math.max(max, this.activeStep);
  }

  finish(): void {
    if (!this.step4Ready || !this.createdOrganizationId) {
      return;
    }
    this.organizationsApi
      .setDefaultOrganization(this.createdOrganizationId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          const current = this.activeContextState.getActiveContext();
          this.activeContextState.setActiveContext({
            ...current,
            organizationId: this.createdOrganizationId ?? current.organizationId,
          });
          const orgId = this.createdOrganizationId ?? '';
          if (this.managePending) {
            this.sessionState.clearPendingOrgSetup();
          }
          if (orgId) {
            this.completed.emit({ organizationId: orgId });
          }
          if (this.navigateOnComplete) {
            this.router.navigateByUrl('/context/select');
          }
        },
        error: (err) => {
          const message =
            err?.error?.message || 'No se pudo finalizar la configuracion de la organizacion.';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: message,
          });
        },
      });
  }

  private persistPendingSetup(): void {
    if (!this.createdOrganizationId || !this.pendingStartedAt) {
      return;
    }
    this.sessionState.setPendingOrgSetup({
      organizationId: this.createdOrganizationId,
      startedAt: this.pendingStartedAt,
      lastStep: this._activeStep,
    });
  }

  private verifyAndAdvanceToStep2(organizationId: string): void {
    if (!organizationId) {
      return;
    }
    this.organizationCoreApi
      .getCoreSettings(organizationId)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.activeStep = 2;
        },
        error: (err: unknown) => {
          const status = err instanceof HttpErrorResponse ? err.status : null;
          const detail =
            status === 401 || status === 403
              ? 'Debes iniciar sesion para continuar.'
              : 'No se pudo cargar la configuracion de la organizacion.';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail,
          });
          if (status === 401 || status === 403) {
            this.router.navigateByUrl('/auth/login');
          }
        },
      });
  }

  private normalizeStep(value?: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return 1;
    }
    if (value < 1) {
      return 1;
    }
    if (value > 4) {
      return 4;
    }
    return value;
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
