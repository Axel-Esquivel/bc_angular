import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-organization-pending-page',
  templateUrl: './organization-pending-page.component.html',
  styleUrl: './organization-pending-page.component.scss',
  standalone: false,
})
export class OrganizationPendingPageComponent {
  constructor(private readonly router: Router) {}

  goBack(): void {
    this.router.navigateByUrl('/organizations/entry');
  }
}
