import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

import { ProductsApiService } from '../../../../core/api/products-api.service';
import { PosCartLine } from '../../../../shared/models/pos.model';
import { Product } from '../../../../shared/models/product.model';

@Component({
  selector: 'app-pos-terminal-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TableModule, InputNumberModule, ButtonModule, InputTextModule],
  templateUrl: './pos-terminal-page.component.html',
  styleUrl: './pos-terminal-page.component.scss',
})
export class PosTerminalPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productsApi = inject(ProductsApiService);

  productResults: Product[] = [];
  cartLines: PosCartLine[] = [];
  subtotal = 0;

  readonly searchForm = this.fb.nonNullable.group({
    search: ['', Validators.required],
  });

  ngOnInit(): void {
    this.searchProducts();
  }

  searchProducts(): void {
    const search = this.searchForm.getRawValue().search;
    this.productsApi.getProducts({ search }).subscribe({
      next: (response) => {
        this.productResults = response.result.items ?? [];
      },
      error: () => {
        this.productResults = [];
      },
    });
  }

  addToCart(product: Product): void {
    const existing = this.cartLines.find((line) => line.productId === product.id);
    if (existing) {
      existing.quantity += 1;
      existing.subtotal = existing.quantity * (existing.unitPrice ?? 0);
    } else {
      this.cartLines.push({
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price ?? 0,
        subtotal: product.price ?? 0,
      });
    }
    this.recalculateTotals();
  }

  updateQuantity(line: PosCartLine, quantity: number): void {
    line.quantity = quantity;
    line.subtotal = quantity * (line.unitPrice ?? 0);
    this.recalculateTotals();
  }

  removeLine(line: PosCartLine): void {
    this.cartLines = this.cartLines.filter((l) => l.productId !== line.productId);
    this.recalculateTotals();
  }

  recalculateTotals(): void {
    this.subtotal = this.cartLines.reduce((acc, line) => acc + line.subtotal, 0);
  }

  checkout(): void {
    // TODO: Conectar con `PosApiService` cuando los endpoints estén confirmados
    alert('Cobro registrado en modo demo.');
  }
}
