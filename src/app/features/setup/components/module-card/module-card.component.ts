import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Chip } from 'primeng/chip';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';

import { OrganizationModuleStoreItem } from '../../../../shared/models/organization-module-store.model';

@Component({
  selector: 'app-module-card',
  standalone: true,
  imports: [CommonModule, Card, Button, Tag, Chip, Tooltip],
  templateUrl: './module-card.component.html',
  styleUrl: './module-card.component.scss',
})
export class ModuleCardComponent {
  @Input({ required: true }) module!: OrganizationModuleStoreItem;
  @Input() isInstalling = false;
  @Input() isUninstalling = false;

  @Output() install = new EventEmitter<OrganizationModuleStoreItem>();
  @Output() uninstall = new EventEmitter<OrganizationModuleStoreItem>();

  get headerTitle(): string {
    return this.module.name || this.module.key;
  }

  get headerVersion(): string {
    return this.module.version || '';
  }

  get statusLabel(): string {
    return this.module.installed ? 'Instalado' : 'Disponible';
  }

  get statusSeverity(): 'success' | 'info' {
    return this.module.installed ? 'success' : 'info';
  }

  onInstall(): void {
    this.install.emit(this.module);
  }

  onUninstall(): void {
    this.uninstall.emit(this.module);
  }
}
