import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';

import { BranchesApiService } from '../../../../core/api/branches-api.service';
import { WarehousesApiService, Warehouse } from '../../../../core/api/warehouses-api.service';
import { Branch } from '../../../../shared/models/branch.model';

@Component({
  selector: 'app-warehouses-page',
  templateUrl: './warehouses-page.component.html',
  styleUrl: './warehouses-page.component.scss',
  providers: [MessageService],
  standalone: false,
})
export class WarehousesPageComponent implements OnInit {
  warehouses: Warehouse[] = [];
  branches: Branch[] = [];
  loading = false;
  dialogOpen = false;
  submitting = false;
  editingWarehouse: Warehouse | null = null;
  companyId = '';

  form!: FormGroup<{
    name: FormControl<string>;
    branchId: FormControl<string>;
    code: FormControl<string>;
  }>;

  constructor(
    private readonly warehousesApi: WarehousesApiService,
    private readonly branchesApi: BranchesApiService,
    private readonly route: ActivatedRoute,
    private readonly fb: FormBuilder,
    private readonly messageService: MessageService,
  ) {
    this.form = this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      branchId: ['', [Validators.required]],
      code: [''],
    });
  }

  ngOnInit(): void {
    this.companyId = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    if (!this.companyId) {
      return;
    }
    this.loadBranches();
    this.loadWarehouses();
  }

  get branchOptions(): Array<{ label: string; value: string }> {
    return this.branches.map((branch) => ({
      label: branch.name ? `${branch.name} (${branch.id})` : branch.id ?? '',
      value: branch.id ?? '',
    }));
  }

  openCreate(): void {
    this.editingWarehouse = null;
    this.form.reset({
      name: '',
      branchId: this.branchOptions[0]?.value ?? '',
      code: '',
    });
    this.dialogOpen = true;
  }

  openEdit(warehouse: Warehouse): void {
    this.editingWarehouse = warehouse;
    this.form.reset({
      name: warehouse.name,
      branchId: warehouse.branchId ?? '',
      code: warehouse.code ?? '',
    });
    this.dialogOpen = true;
  }

  save(): void {
    if (this.form.invalid || this.submitting || !this.companyId) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const payload = this.form.getRawValue();

    const request$ = this.editingWarehouse?.id
      ? this.warehousesApi.update(this.editingWarehouse.id, {
          name: payload.name,
          branchId: payload.branchId,
          code: payload.code || undefined,
        })
      : this.warehousesApi.createForCompany(this.companyId, {
          name: payload.name,
          branchId: payload.branchId,
          code: payload.code || undefined,
        });

    request$.subscribe({
      next: ({ result }) => {
        if (result) {
          const id = result.id ?? '';
          const index = this.warehouses.findIndex((item) => item.id === id);
          if (index >= 0) {
            this.warehouses[index] = result;
          } else {
            this.warehouses = [result, ...this.warehouses];
          }
        }
        this.dialogOpen = false;
        this.submitting = false;
      },
      error: () => {
        this.submitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Bodegas',
          detail: 'No se pudo guardar la bodega.',
        });
      },
    });
  }

  private loadWarehouses(): void {
    this.loading = true;
    this.warehousesApi.listByCompany(this.companyId).subscribe({
      next: ({ result }) => {
        this.warehouses = result ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Bodegas',
          detail: 'No se pudieron cargar las bodegas.',
        });
      },
    });
  }

  private loadBranches(): void {
    this.branchesApi.listByCompany(this.companyId).subscribe({
      next: ({ result }) => {
        this.branches = result ?? [];
        if (!this.form.controls.branchId.value && this.branches.length > 0) {
          this.form.controls.branchId.setValue(this.branches[0].id ?? '');
        }
      },
      error: () => {
        this.branches = [];
      },
    });
  }
}
