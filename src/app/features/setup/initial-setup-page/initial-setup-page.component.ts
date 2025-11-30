import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-initial-setup-page',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './initial-setup-page.component.html',
  styleUrl: './initial-setup-page.component.scss',
})
export class InitialSetupPageComponent {}
