import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { TableModule } from 'primeng/table';

import { Workspace } from '../../../../shared/models/workspace.model';

@Component({
  selector: 'app-workspace-list',
  standalone: true,
  imports: [CommonModule, Card, TableModule, Button],
  templateUrl: './workspace-list.component.html',
  styleUrl: './workspace-list.component.scss',
})
export class WorkspaceListComponent {
  @Input() workspaces: Workspace[] | null = [];
  @Input() loading = false;
  @Input() unavailable = false;

  @Output() refresh = new EventEmitter<void>();
  @Output() select = new EventEmitter<Workspace>();
}
