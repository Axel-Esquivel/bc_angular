import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';

@Component({
  selector: 'app-adjustments-page',
  standalone: true,
  imports: [CommonModule, Card, Button],
  templateUrl: './adjustments-page.component.html',
  styleUrl: './adjustments-page.component.scss',
})
export class AdjustmentsPageComponent {}
