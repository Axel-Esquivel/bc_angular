import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

import { ProductsApiService } from '../../../../core/api/products-api.service';
import { Product } from '../../../../shared/models/product.model';

@Component({
  selector: 'app-products-list-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TableModule, DropdownModule, InputTextModule, ButtonModule],
  templateUrl: './products-list-page.component.html',
  styleUrl: './products-list-page.component.scss',
})
export class ProductsListPageComponent implements OnInit {
  private readonly productsApi = inject(ProductsApiService);
  private readonly fb = inject(FormBuilder);

  products: Product[] = [];
  loading = false;
  categories = [
    { label: 'Todas', value: '' },
    { label: 'Bebidas', value: 'beverages' },
    { label: 'Snacks', value: 'snacks' },
  ];

  readonly filtersForm = this.fb.nonNullable.group({
    search: [''],
    category: [''],
  });

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    const filters = this.filtersForm.getRawValue();
    this.productsApi.getProducts({
      search: filters.search || undefined,
      category: filters.category || undefined,
    }).subscribe({
      next: (response) => {
        this.products = response.result.items ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  clearFilters(): void {
    this.filtersForm.reset({ search: '', category: '' });
    this.loadProducts();
  }
}
