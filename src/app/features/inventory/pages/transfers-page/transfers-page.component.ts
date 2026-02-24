import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';

@Component({
  selector: 'app-transfers-page',
  standalone: true,
  imports: [CommonModule, Card, Button],
  templateUrl: './transfers-page.component.html',
  styleUrl: './transfers-page.component.scss',
})
export class TransfersPageComponent {}
