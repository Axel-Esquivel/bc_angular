import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MessageService, TreeNode } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Dialog } from 'primeng/dialog';
import { TableModule, TableRowSelectEvent } from 'primeng/table';

import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { ActiveContext } from '../../../../shared/models/active-context.model';
import {
  LocationCreatePayload,
  LocationNode,
  LocationUpdatePayload,
  Warehouse,
  WarehouseCreatePayload,
  WarehouseUpdatePayload,
  WarehousesService,
} from '../../services/warehouses.service';
import { LocationsTreeComponent } from '../../components/locations-tree/locations-tree.component';
import {
  LocationFormDialogComponent,
  LocationFormValue,
} from '../../components/location-form-dialog/location-form-dialog.component';
import {
  WarehouseFormDialogComponent,
  WarehouseFormValue,
} from '../../components/warehouse-form-dialog/warehouse-form-dialog.component';

@Component({
  selector: 'app-warehouses-page',
  standalone: true,
  imports: [
    CommonModule,
    Card,
    TableModule,
    Button,
    Dialog,
    LocationsTreeComponent,
    WarehouseFormDialogComponent,
    LocationFormDialogComponent,
  ],
  templateUrl: './warehouses-page.component.html',
  styleUrl: './warehouses-page.component.scss',
  providers: [MessageService],
})
export class WarehousesPageComponent implements OnInit {
  private readonly warehousesService = inject(WarehousesService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly messageService = inject(MessageService);

  warehouses: Warehouse[] = [];
  selectedWarehouse: Warehouse | null = null;
  loadingWarehouses = false;

  treeNodes: Array<TreeNode<LocationNode>> = [];
  locationsLoading = false;

  warehouseDialogOpen = false;
  locationDialogOpen = false;
  warehouseSubmitting = false;
  locationSubmitting = false;

  editingWarehouse: Warehouse | null = null;
  editingLocation: LocationNode | null = null;
  locationParentId: string | null = null;
  locationParentLabel = 'Raiz';

  private locationIndex = new Map<string, LocationNode>();
  private context: ActiveContext | null = null;

  ngOnInit(): void {
    const context = this.activeContextState.getActiveContext();
    if (!this.activeContextState.isComplete(context)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto incompleto',
        detail: 'Selecciona organizacion y empresa antes de gestionar bodegas.',
      });
      return;
    }
    this.context = context;
    this.loadWarehouses();
  }

  onWarehouseSelected(event: TableRowSelectEvent<Warehouse>): void {
    const selected = Array.isArray(event.data) ? event.data[0] : event.data ?? null;
    if (!selected) {
      return;
    }
    this.selectedWarehouse = selected;
    this.loadLocations(selected);
  }

  openCreateWarehouse(): void {
    this.editingWarehouse = null;
    this.warehouseDialogOpen = true;
  }

  openEditWarehouse(warehouse: Warehouse): void {
    this.editingWarehouse = warehouse;
    this.warehouseDialogOpen = true;
  }

  saveWarehouse(formValue: WarehouseFormValue): void {
    const ids = this.requireContext();
    if (!ids) {
      return;
    }

    const payload: WarehouseCreatePayload | WarehouseUpdatePayload = {
      organizationId: ids.organizationId,
      enterpriseId: ids.enterpriseId,
      code: formValue.code,
      name: formValue.name,
      active: formValue.active,
    };

    this.warehouseSubmitting = true;

    const request$ = this.editingWarehouse
      ? this.warehousesService.update(this.editingWarehouse.id, payload)
      : this.warehousesService.create(payload);

    request$.subscribe({
      next: ({ result }) => {
        if (result) {
          this.upsertWarehouse(result);
        }
        this.warehouseDialogOpen = false;
        this.warehouseSubmitting = false;
      },
      error: () => {
        this.warehouseSubmitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Bodegas',
          detail: 'No se pudo guardar la bodega.',
        });
      },
    });
  }

  deleteWarehouse(warehouse: Warehouse): void {
    if (!warehouse.id) {
      return;
    }
    const confirmed = window.confirm('Eliminar la bodega seleccionada?');
    if (!confirmed) {
      return;
    }

    this.warehousesService.remove(warehouse.id).subscribe({
      next: () => {
        this.warehouses = this.warehouses.filter((item) => item.id !== warehouse.id);
        if (this.selectedWarehouse?.id === warehouse.id) {
          this.selectedWarehouse = null;
          this.treeNodes = [];
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Bodegas',
          detail: 'No se pudo eliminar la bodega.',
        });
      },
    });
  }

  openCreateRootLocation(): void {
    if (!this.selectedWarehouse) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Ubicaciones',
        detail: 'Selecciona una bodega antes de crear ubicaciones.',
      });
      return;
    }
    this.editingLocation = null;
    this.locationParentId = null;
    this.locationParentLabel = 'Raiz';
    this.locationDialogOpen = true;
  }

  openCreateChildLocation(parentId: string): void {
    const parent = this.locationIndex.get(parentId);
    if (!parent) {
      return;
    }
    this.editingLocation = null;
    this.locationParentId = parentId;
    this.locationParentLabel = parent.name;
    this.locationDialogOpen = true;
  }

  openEditLocation(locationId: string): void {
    const location = this.locationIndex.get(locationId);
    if (!location) {
      return;
    }
    this.editingLocation = location;
    this.locationParentId = location.parentLocationId;
    this.locationParentLabel =
      (location.parentLocationId && this.locationIndex.get(location.parentLocationId)?.name) || 'Raiz';
    this.locationDialogOpen = true;
  }

  saveLocation(formValue: LocationFormValue): void {
    const ids = this.requireContext();
    const warehouse = this.selectedWarehouse;
    if (!ids || !warehouse) {
      return;
    }

    this.locationSubmitting = true;

    if (this.editingLocation) {
      const updatePayload: LocationUpdatePayload = {
        code: formValue.code,
        name: formValue.name,
        type: formValue.type,
        usage: formValue.usage,
        active: formValue.active,
      };

      this.warehousesService.updateLocation(this.editingLocation.id, updatePayload).subscribe({
        next: () => {
          this.locationDialogOpen = false;
          this.locationSubmitting = false;
          this.loadLocations(warehouse);
        },
        error: () => {
          this.locationSubmitting = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Ubicaciones',
            detail: 'No se pudo actualizar la ubicacion.',
          });
        },
      });
      return;
    }

    const createPayload: LocationCreatePayload = {
      organizationId: ids.organizationId,
      enterpriseId: ids.enterpriseId,
      warehouseId: warehouse.id,
      parentLocationId: this.locationParentId,
      code: formValue.code,
      name: formValue.name,
      type: formValue.type,
      usage: formValue.usage,
      active: formValue.active,
    };

    this.warehousesService.createLocation(createPayload).subscribe({
      next: () => {
        this.locationDialogOpen = false;
        this.locationSubmitting = false;
        this.loadLocations(warehouse);
      },
      error: () => {
        this.locationSubmitting = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Ubicaciones',
          detail: 'No se pudo crear la ubicacion.',
        });
      },
    });
  }

  loadWarehouses(): void {
    const ids = this.requireContext();
    if (!ids) {
      return;
    }

    this.loadingWarehouses = true;
    this.warehousesService.getAll(ids.organizationId, ids.enterpriseId).subscribe({
      next: ({ result }) => {
        this.warehouses = result ?? [];
        this.loadingWarehouses = false;
        if (this.warehouses.length > 0) {
          const selectedId = this.selectedWarehouse?.id;
          const nextSelection = this.warehouses.find((item) => item.id === selectedId) ?? this.warehouses[0];
          this.selectedWarehouse = nextSelection;
          this.loadLocations(nextSelection);
        } else {
          this.selectedWarehouse = null;
          this.treeNodes = [];
        }
      },
      error: () => {
        this.loadingWarehouses = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Bodegas',
          detail: 'No se pudieron cargar las bodegas.',
        });
      },
    });
  }

  private loadLocations(warehouse: Warehouse): void {
    this.locationsLoading = true;
    this.warehousesService.getLocationsTree(warehouse.id).subscribe({
      next: ({ result }) => {
        const nodes = result ?? [];
        this.locationIndex.clear();
        this.indexLocations(nodes);
        this.treeNodes = this.mapTreeNodes(nodes);
        this.locationsLoading = false;
      },
      error: () => {
        this.locationsLoading = false;
        this.treeNodes = [];
        this.locationIndex.clear();
        this.messageService.add({
          severity: 'error',
          summary: 'Ubicaciones',
          detail: 'No se pudieron cargar las ubicaciones.',
        });
      },
    });
  }

  private mapTreeNodes(nodes: LocationNode[]): Array<TreeNode<LocationNode>> {
    return nodes.map((node) => ({
      key: node.id,
      label: node.name,
      data: node,
      expanded: true,
      children: this.mapTreeNodes(node.children ?? []),
    }));
  }

  private indexLocations(nodes: LocationNode[]): void {
    nodes.forEach((node) => {
      this.locationIndex.set(node.id, node);
      if (node.children.length > 0) {
        this.indexLocations(node.children);
      }
    });
  }

  private upsertWarehouse(warehouse: Warehouse): void {
    const index = this.warehouses.findIndex((item) => item.id === warehouse.id);
    if (index >= 0) {
      this.warehouses[index] = warehouse;
      this.warehouses = [...this.warehouses];
    } else {
      this.warehouses = [warehouse, ...this.warehouses];
    }
    this.selectedWarehouse = warehouse;
    this.loadLocations(warehouse);
  }

  private requireContext(): { organizationId: string; enterpriseId: string } | null {
    const context = this.context ?? this.activeContextState.getActiveContext();
    if (!context.organizationId || !context.enterpriseId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto incompleto',
        detail: 'Selecciona organizacion y empresa antes de continuar.',
      });
      return null;
    }
    return { organizationId: context.organizationId, enterpriseId: context.enterpriseId };
  }
}
