import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TreeModule } from 'primeng/tree';
import { Button } from 'primeng/button';
import { TreeNode } from 'primeng/api';

import { LocationNode } from '../../services/warehouses.service';

@Component({
  selector: 'app-locations-tree',
  standalone: true,
  imports: [CommonModule, TreeModule, Button],
  templateUrl: './locations-tree.component.html',
  styleUrl: './locations-tree.component.scss',
})
export class LocationsTreeComponent {
  @Input() nodes: Array<TreeNode<LocationNode>> = [];
  @Input() loading = false;
  @Input() emptyMessage = 'Selecciona una bodega para ver ubicaciones.';
  @Output() createRoot = new EventEmitter<void>();
  @Output() createChild = new EventEmitter<string>();
  @Output() editLocation = new EventEmitter<string>();

  onCreateRoot(): void {
    this.createRoot.emit();
  }

  onCreateChild(nodeId: string | null): void {
    if (!nodeId) {
      return;
    }
    this.createChild.emit(nodeId);
  }

  onEdit(nodeId: string | null): void {
    if (!nodeId) {
      return;
    }
    this.editLocation.emit(nodeId);
  }
}
