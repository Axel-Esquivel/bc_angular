import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';

@Component({
  selector: 'app-reservations-page',
  standalone: true,
  imports: [CommonModule, Card, Button],
  templateUrl: './reservations-page.component.html',
  styleUrl: './reservations-page.component.scss',
})
export class ReservationsPageComponent {}
