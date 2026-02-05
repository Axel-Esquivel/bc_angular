import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { StepperModule } from 'primeng/stepper';
import { Toast } from 'primeng/toast';

import { OrgSetupComponentsModule } from '../../components/org-setup-components.module';
import { OrganizationsService } from '../../../../core/api/organizations-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { SessionStateService } from '../../../../core/services/session-state.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-org-create-page',
  standalone: true,
  imports: [CommonModule, Button, Card, StepperModule, Toast, OrgSetupComponentsModule],
  templateUrl: './org-create-page.component.html',
  styleUrl: './org-create-page.component.scss',
})
export class OrgCreatePageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly organizationsApi = inject(OrganizationsService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly sessionState = inject(SessionStateService);
  private readonly messageService = inject(MessageService);

  @Input() organizationId?: string;
  @Input() startStep = 0;
  @Input() managePending = true;
  @Input() navigateOnComplete = true;
  @Input() visibleInDialog = false;

  @Output() cancelled = new EventEmitter<void>();
  @Output() completed = new EventEmitter<{ organizationId: string }>();
  @Output() organizationCreated = new EventEmitter<{ organizationId: string }>();
  @Output() stepChanged = new EventEmitter<number>();

  private _activeStep = 0;
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
      this._activeStep = this.startStep;
      return;
    }
    if (pending && this.sessionState.isAuthenticated()) {
      this.createdOrganizationId = pending.organizationId;
      this.pendingStartedAt = pending.startedAt;
      this._activeStep = pending.lastStep ?? 0;
      return;
    }
    this._activeStep = this.startStep;
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
    this.activeStep = 1;
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

  goBack(): void {
    if (this.activeStep > 0) {
      this.activeStep -= 1;
    }
  }

  goNext(): void {
    if (this.activeStep === 0) {
      if (!this.step1Valid || this.isSubmittingOrg) {
        return;
      }
      this.isSubmittingOrg = true;
      return;
    }

    if (this.activeStep === 1 && !this.step2Ready) {
      return;
    }

    if (this.activeStep === 2 && !this.step3Ready) {
      return;
    }

    if (this.activeStep < 3) {
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

  onCancel(): void {
    this.cancelled.emit();
  }
}
