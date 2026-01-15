import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';

import { ProductsApiService } from '../../../../core/api/products-api.service';
import { Product } from '../../../../shared/models/product.model';

@Component({
  selector: 'app-products-list-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, Card, Button, InputText, Select, TableModule],
  templateUrl: './products-list-page.component.html',
  styleUrl: './products-list-page.component.scss',
})
export class ProductsListPageComponent implements OnInit {
  private readonly productsApi = inject(ProductsApiService);
  private readonly fb = inject(FormBuilder);

  products: Product[] = [];
  loading = false;

  readonly categoryOptions = [
    { label: 'Todas', value: '' },
    { label: 'General', value: 'general' },
    { label: 'Servicios', value: 'services' },
    { label: 'Electrónica', value: 'electronics' },
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
    const { search, category } = this.filtersForm.getRawValue();
    this.productsApi.getProducts({ search: search?.trim(), category: category || undefined }).subscribe({
      next: (response) => {
        this.products = response.result.items ?? [];
        this.loading = false;
      },
      error: () => {
        this.products = [];
        this.loading = false;
      },
    });
  }

  onResetFilters(): void {
    this.filtersForm.reset({ search: '', category: '' });
    this.loadProducts();
  }
}
