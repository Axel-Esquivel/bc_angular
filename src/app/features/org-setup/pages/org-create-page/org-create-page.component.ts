import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { StepperModule } from 'primeng/stepper';

import { OrgSetupComponentsModule } from '../../components/org-setup-components.module';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { SessionStateService } from '../../../../core/services/session-state.service';
import { take } from 'rxjs/operators';
import { OrganizationCoreApiService } from '../../../../core/api/organization-core-api.service';

@Component({
  selector: 'app-org-create-page',
  standalone: true,
  imports: [CommonModule, Button, Card, ConfirmDialog, StepperModule, OrgSetupComponentsModule],
  templateUrl: './org-create-page.component.html',
  styleUrl: './org-create-page.component.scss',
  providers: [ConfirmationService],
})
export class OrgCreatePageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly organizationCoreApi = inject(OrganizationCoreApiService);
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

  onEditCountry(_country: unknown): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Pais',
      detail: 'Edicion no disponible por el momento.',
    });
  }

  onDeleteCountry(_country: unknown): void {
    this.confirmationService.confirm({
      header: 'Eliminar pais',
      message: '¿Deseas eliminar este pais? Esta accion no esta disponible por el momento.',
      acceptLabel: 'Aceptar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.messageService.add({
          severity: 'info',
          summary: 'Pais',
          detail: 'Eliminacion no disponible por el momento.',
        });
      },
    });
  }

  onEditCurrency(_currency: unknown): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Moneda',
      detail: 'Edicion no disponible por el momento.',
    });
  }

  onDeleteCurrency(_currency: unknown): void {
    this.confirmationService.confirm({
      header: 'Eliminar moneda',
      message: '¿Deseas eliminar esta moneda? Esta accion no esta disponible por el momento.',
      acceptLabel: 'Aceptar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.messageService.add({
          severity: 'info',
          summary: 'Moneda',
          detail: 'Eliminacion no disponible por el momento.',
        });
      },
    });
  }

  onEditCompany(_company: unknown): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Compania',
      detail: 'Edicion no disponible por el momento.',
    });
  }

  onDeleteCompany(_company: unknown): void {
    this.confirmationService.confirm({
      header: 'Eliminar compania',
      message: '¿Deseas eliminar esta compania? Esta accion no esta disponible por el momento.',
      acceptLabel: 'Aceptar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.messageService.add({
          severity: 'info',
          summary: 'Compania',
          detail: 'Eliminacion no disponible por el momento.',
        });
      },
    });
  }

  onEditBranch(_branch: unknown): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Empresa',
      detail: 'Edicion no disponible por el momento.',
    });
  }

  onDeleteBranch(_branch: unknown): void {
    this.confirmationService.confirm({
      header: 'Eliminar empresa',
      message: '¿Deseas eliminar esta empresa? Esta accion no esta disponible por el momento.',
      acceptLabel: 'Aceptar',
      rejectLabel: 'Cancelar',
      accept: () => {
        this.messageService.add({
          severity: 'info',
          summary: 'Empresa',
          detail: 'Eliminacion no disponible por el momento.',
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
