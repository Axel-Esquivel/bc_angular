import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ProductsApiService } from '../../../../core/api/products-api.service';
import { PosApiService } from '../../../../core/api/pos-api.service';
import { PosCartLine } from '../../../../shared/models/pos.model';
import { Product } from '../../../../shared/models/product.model';
import { CartLinesPanelComponent } from '../../components/cart-lines-panel/cart-lines-panel.component';
import { ProductSelectorComponent } from '../../components/product-selector/product-selector.component';
import { TotalsPanelComponent } from '../../components/totals-panel/totals-panel.component';

@Component({
  selector: 'app-pos-terminal-page',
  standalone: true,
  imports: [CommonModule, ProductSelectorComponent, CartLinesPanelComponent, TotalsPanelComponent],
  templateUrl: './pos-terminal-page.component.html',
  styleUrl: './pos-terminal-page.component.scss',
})
export class PosTerminalPageComponent implements OnInit {
  private readonly productsApi = inject(ProductsApiService);
  private readonly posApi = inject(PosApiService);

  products: Product[] = [];
  productsLoading = false;
  cartLines: PosCartLine[] = [];
  subtotal = 0;

  ngOnInit(): void {
    this.onSearchProducts('');
  }

  onSearchProducts(term: string): void {
    this.productsLoading = true;
    this.productsApi.getProducts({ search: term }).subscribe({
      next: (response) => {
        this.products = response.result.items ?? [];
        this.productsLoading = false;
      },
      error: () => {
        this.products = [];
        this.productsLoading = false;
      },
    });
  }

  onAddProduct(product: Product): void {
    const existing = this.cartLines.find((line) => line.productId === product.id);
    if (existing) {
      existing.quantity += 1;
      existing.subtotal = existing.quantity * (existing.unitPrice ?? 0);
    } else {
      this.cartLines = [
        ...this.cartLines,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price ?? 0,
          subtotal: product.price ?? 0,
        },
      ];
    }
    this.recalculateTotals();
  }

  onQuantityChange(lineId: string, quantity: number): void {
    this.cartLines = this.cartLines.map((line) =>
      line.productId === lineId
        ? { ...line, quantity, subtotal: quantity * (line.unitPrice ?? 0) }
        : line
    );
    this.recalculateTotals();
  }

  onRemoveLine(lineId: string): void {
    this.cartLines = this.cartLines.filter((line) => line.productId !== lineId);
    this.recalculateTotals();
  }

  onCheckout(): void {
    // TODO: Conectar con PosApiService cuando los endpoints de tickets/ventas estén confirmados
    void this.posApi;
    alert('Cobro registrado en modo demostración.');
  }

  private recalculateTotals(): void {
    this.subtotal = this.cartLines.reduce((acc, line) => acc + line.subtotal, 0);
  }
}
