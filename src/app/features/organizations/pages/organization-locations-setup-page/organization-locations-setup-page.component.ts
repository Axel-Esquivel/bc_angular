import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';

import { OrganizationCoreApiService } from '../../services/organization-core-api.service';
import { OrganizationModulesApiService } from '../../services/organization-modules-api.service';
import { OrganizationLocationsApiService } from '../../services/organization-locations-api.service';
import { CoreCompany, OrganizationCoreSettings } from '../../models/organization-core.models';
import {
  CreateInventoryLocationPayload,
  InventoryLocation,
  LocationType,
} from '../../models/organization-locations.models';

interface ToastMessage {
  severity: 'success' | 'info' | 'warn' | 'error';
  summary: string;
  detail: string;
}

const LOCATION_TYPES: { branch: LocationType; warehouse: LocationType } = {
  branch: 'branch',
  warehouse: 'warehouse',
};

@Component({
  selector: 'app-organization-locations-setup-page',
  templateUrl: './organization-locations-setup-page.component.html',
  styleUrls: ['./organization-locations-setup-page.component.scss'],
  standalone: false,
  providers: [MessageService],
})
export class OrganizationLocationsSetupPageComponent implements OnInit {
  organizationId = '';
  companyId = '';
  companyOptions: CoreCompany[] = [];
  selectedCompany: CoreCompany | null = null;
  coreSettings: OrganizationCoreSettings = {
    countries: [],
    currencies: [],
    companies: [],
  };

  locations: InventoryLocation[] = [];
  branchLocations: InventoryLocation[] = [];
  warehouseLocations: InventoryLocation[] = [];

  loading = false;
  submitting = false;
  moduleEnabled = false;

  branchForm: FormGroup<{ name: FormControl<string> }>;
  warehouseForm: FormGroup<{ name: FormControl<string> }>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly coreApi: OrganizationCoreApiService,
    private readonly modulesApi: OrganizationModulesApiService,
    private readonly locationsApi: OrganizationLocationsApiService,
    private readonly messageService: MessageService,
  ) {
    this.branchForm = this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
    });
    this.warehouseForm = this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
    });
  }

  ngOnInit(): void {
    this.organizationId = this.route.snapshot.queryParamMap.get('orgId') ?? '';
    this.companyId = this.route.snapshot.queryParamMap.get('companyId') ?? '';

    if (!this.organizationId) {
      this.router.navigateByUrl('/organizations/setup');
      return;
    }

    this.checkModuleStatus();
  }

  onCompanyChange(): void {
    this.companyId = this.selectedCompany?.id ?? '';
    this.loadLocations();
  }

  createBranch(): void {
    this.createLocation(LOCATION_TYPES.branch, this.branchForm);
  }

  createWarehouse(): void {
    this.createLocation(LOCATION_TYPES.warehouse, this.warehouseForm);
  }

  saveAndContinue(): void {
    if (!this.organizationId || this.submitting) {
      return;
    }
    this.submitting = true;
    this.modulesApi.markConfigured(this.organizationId, 'locations').subscribe({
      next: () => {
        this.submitting = false;
        const queryParams: { orgId: string; companyId?: string } = { orgId: this.organizationId };
        if (this.companyId) {
          queryParams.companyId = this.companyId;
        }
        this.router.navigate(['/organizations/modules'], { queryParams });
      },
      error: () => {
        this.submitting = false;
        this.pushMessage({
          severity: 'error',
          summary: 'Configuracion',
          detail: 'No se pudo completar la configuracion.',
        });
      },
    });
  }

  private checkModuleStatus(): void {
    this.loading = true;
    this.modulesApi.getOverview(this.organizationId).subscribe({
      next: (res) => {
        const modules = res?.result?.modules ?? [];
        const moduleEntry = modules.find((moduleItem) => moduleItem.key === 'locations');
        this.moduleEnabled = moduleEntry?.state?.status !== 'disabled';
        if (!this.moduleEnabled) {
          this.loading = false;
          this.pushMessage({
            severity: 'warn',
            summary: 'Locations',
            detail: 'El modulo de locations no esta activado.',
          });
          const queryParams: { orgId: string } = { orgId: this.organizationId };
          this.router.navigate(['/organizations/modules'], { queryParams });
          return;
        }
        this.loadCoreSettings();
      },
      error: () => {
        this.loading = false;
        this.pushMessage({
          severity: 'error',
          summary: 'Locations',
          detail: 'No se pudo validar el modulo.',
        });
      },
    });
  }

  private loadCoreSettings(): void {
    this.coreApi.getCoreSettings(this.organizationId).subscribe({
      next: (res) => {
        this.coreSettings = res?.result ?? { countries: [], currencies: [], companies: [] };
        this.companyOptions = this.coreSettings.companies;
        this.selectInitialCompany();
        this.loadLocations();
      },
      error: () => {
        this.loading = false;
        this.pushMessage({
          severity: 'error',
          summary: 'Locations',
          detail: 'No se pudo cargar la organizacion.',
        });
      },
    });
  }

  private selectInitialCompany(): void {
    if (this.companyId) {
      const match = this.companyOptions.find((company) => company.id === this.companyId) ?? null;
      this.selectedCompany = match;
      return;
    }
    if (this.companyOptions.length === 1) {
      this.selectedCompany = this.companyOptions[0];
      this.companyId = this.selectedCompany?.id ?? '';
    }
  }

  private loadLocations(): void {
    if (!this.companyId) {
      this.locations = [];
      this.branchLocations = [];
      this.warehouseLocations = [];
      this.loading = false;
      return;
    }
    this.locationsApi.list(this.organizationId, this.companyId).subscribe({
      next: (res) => {
        this.locations = res?.result ?? [];
        this.branchLocations = this.locations.filter((item) => item.type === 'branch');
        this.warehouseLocations = this.locations.filter((item) => item.type === 'warehouse');
        this.loading = false;
      },
      error: () => {
        this.locations = [];
        this.branchLocations = [];
        this.warehouseLocations = [];
        this.loading = false;
        this.pushMessage({
          severity: 'error',
          summary: 'Locations',
          detail: 'No se pudieron cargar las locations.',
        });
      },
    });
  }

  private createLocation(
    type: LocationType,
    form: FormGroup<{ name: FormControl<string> }>,
  ): void {
    if (!this.companyId || this.submitting || form.invalid) {
      form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payloadValue = form.getRawValue();
    const payload: CreateInventoryLocationPayload = {
      name: payloadValue.name,
      type,
    };

    this.locationsApi.create(this.organizationId, this.companyId, payload).subscribe({
      next: (res) => {
        const created = res?.result;
        if (created) {
          this.locations = [...this.locations, created];
          if (created.type === 'branch') {
            this.branchLocations = [...this.branchLocations, created];
          } else {
            this.warehouseLocations = [...this.warehouseLocations, created];
          }
        }
        form.reset();
        this.submitting = false;
      },
      error: () => {
        this.submitting = false;
        this.pushMessage({
          severity: 'error',
          summary: 'Locations',
          detail: 'No se pudo crear la location.',
        });
      },
    });
  }

  private pushMessage(message: ToastMessage): void {
    this.messageService.add(message);
  }
}
