import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-purchase-receipt-summary',
  standalone: false,
  templateUrl: './purchase-receipt-summary.component.html',
  styleUrl: './purchase-receipt-summary.component.scss',
})
export class PurchaseReceiptSummaryComponent {
  @Input() subtotal = 0;
  @Input() discounts = 0;
  @Input() netTotal = 0;
  @Input() bonusTotal = 0;
}
