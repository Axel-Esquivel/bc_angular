import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';

@Component({
  selector: 'app-org-setup-shell',
  standalone: true,
  imports: [RouterOutlet, Toast],
  templateUrl: './org-setup-shell.component.html',
  styleUrl: './org-setup-shell.component.scss',
})
export class OrgSetupShellComponent {}
