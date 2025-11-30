import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Button } from 'primeng/button';

@Component({
  selector: 'bc-pos-totals',
  standalone: true,
  imports: [CommonModule, Button],
  templateUrl: './totals-panel.component.html',
  styleUrl: './totals-panel.component.scss',
})
export class TotalsPanelComponent {
  @Input() total = 0;
  @Input() itemsCount = 0;

  @Output() checkout = new EventEmitter<void>();

  onCheckout(): void {
    this.checkout.emit();
  }
}
