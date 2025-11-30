import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-workspace-select-page',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule],
  templateUrl: './workspace-select-page.component.html',
  styleUrl: './workspace-select-page.component.scss',
})
export class WorkspaceSelectPageComponent {
  readonly workspaces = [];
}
