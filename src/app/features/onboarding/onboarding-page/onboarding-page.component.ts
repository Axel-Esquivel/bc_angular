import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-onboarding-page',
  templateUrl: './onboarding-page.component.html',
  styleUrl: './onboarding-page.component.scss',
  standalone: false,
})
export class OnboardingPageComponent {
  constructor(private readonly router: Router) {}

  goToCreate(): void {
    this.router.navigateByUrl('/organizations/create');
  }

  goToJoin(): void {
    this.router.navigateByUrl('/organizations/join');
  }
}
