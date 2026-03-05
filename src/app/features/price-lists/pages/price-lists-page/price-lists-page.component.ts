import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { CompaniesApiService } from '../../../../core/api/companies-api.service';
import { PriceListsService } from '../../services/price-lists.service';
import { PriceList } from '../../models/price-list.model';

interface PriceListRow {
  id: string;
  name: string;
  description?: string;
  companyId: string;
  companyLabel: string;
  itemsCount: number;
}

@Component({
  selector: 'app-price-lists-page',
  standalone: false,
  templateUrl: './price-lists-page.component.html',
  styleUrl: './price-lists-page.component.scss',
})
export class PriceListsPageComponent implements OnInit {
  private readonly priceListsService = inject(PriceListsService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly companiesApi = inject(CompaniesApiService);
  private readonly router = inject(Router);

  rows: PriceListRow[] = [];
  loading = false;
  contextMissing = false;
  errorMessage: string | null = null;
  deleteDialogVisible = false;
  deleteTarget: PriceListRow | null = null;

  private organizationId: string | null = null;
  private companyId: string | null = null;
  private companyNames = new Map<string, string>();

  ngOnInit(): void {
    const context = this.activeContextState.getActiveContext();
    this.organizationId = context.organizationId ?? null;
    this.companyId = context.companyId ?? null;
    this.contextMissing = !this.organizationId;
    this.loadCompanies();
    this.loadPriceLists();
  }

  openNew(): void {
    void this.router.navigateByUrl('/app/price-lists/new');
  }

  openEdit(row: PriceListRow): void {
    void this.router.navigateByUrl(`/app/price-lists/${row.id}/edit`);
  }

  openDeleteDialog(row: PriceListRow): void {
    this.deleteTarget = row;
    this.deleteDialogVisible = true;
  }

  confirmDelete(): void {
    const target = this.deleteTarget;
    if (!target) {
      this.deleteDialogVisible = false;
      return;
    }
    this.priceListsService.delete(target.id).subscribe({
      next: () => {
        this.rows = this.rows.filter((item) => item.id !== target.id);
        this.deleteDialogVisible = false;
        this.deleteTarget = null;
      },
      error: () => {
        this.errorMessage = 'No se pudo eliminar la lista.';
      },
    });
  }

  cancelDelete(): void {
    this.deleteDialogVisible = false;
    this.deleteTarget = null;
  }

  private loadCompanies(): void {
    if (!this.organizationId) {
      this.companyNames = new Map();
      return;
    }
    this.companiesApi.listByOrganization(this.organizationId).subscribe({
      next: ({ result }) => {
        const companies = Array.isArray(result) ? result : [];
        this.companyNames = new Map(
          companies
            .filter((company) => !!company.id)
            .map((company) => [company.id ?? '', company.name ?? company.id ?? '']),
        );
        this.rows = this.buildRows(this.rows);
      },
      error: () => {
        this.companyNames = new Map();
      },
    });
  }

  private loadPriceLists(): void {
    if (!this.organizationId) {
      this.rows = [];
      return;
    }
    this.loading = true;
    this.errorMessage = null;
    this.priceListsService.list().subscribe({
      next: ({ result }) => {
        const list = Array.isArray(result) ? result : [];
        this.rows = this.buildRows(list);
        this.loading = false;
      },
      error: () => {
        this.rows = [];
        this.loading = false;
        this.errorMessage = 'No se pudieron cargar las listas de precios.';
      },
    });
  }

  private buildRows(items: Array<PriceList | PriceListRow>): PriceListRow[] {
    const orgId = this.organizationId;
    const companyId = this.companyId;

    const normalized = items.filter((item): item is PriceList => 'items' in item);
    if (normalized.length === 0) {
      return items.filter((item): item is PriceListRow => 'itemsCount' in item);
    }

    return normalized
      .filter((item) => !orgId || item.OrganizationId === orgId)
      .filter((item) => !companyId || item.companyId === companyId)
      .map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        companyId: item.companyId,
        companyLabel: this.companyNames.get(item.companyId) ?? item.companyId,
        itemsCount: Array.isArray(item.items) ? item.items.length : 0,
      }));
  }
}
