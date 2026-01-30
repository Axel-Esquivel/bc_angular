import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-org-setup-entry-page',
  templateUrl: './org-setup-entry-page.component.html',
  styleUrl: './org-setup-entry-page.component.scss',
  standalone: false,
})
export class OrgSetupEntryPageComponent {
  constructor(private readonly router: Router) {}

  goCreate(): void {
    this.router.navigate(['/org/setup/create']);
  }

  goJoin(): void {
    this.router.navigate(['/org/setup/join']);
  }

  goBootstrap(): void {
    this.router.navigate(['/org/setup/bootstrap']);
  }

  goModules(): void {
    this.router.navigate(['/org/setup/modules']);
  }
}
