import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { InputTextareaModule } from 'primeng/inputtextarea';

import { ProductsApiService } from '../../../../core/api/products-api.service';
import { Product } from '../../../../shared/models/product.model';

@Component({
  selector: 'app-product-form-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CardModule,
    InputTextModule,
    InputNumberModule,
    DropdownModule,
    ButtonModule,
    InputTextareaModule,
  ],
  templateUrl: './product-form-page.component.html',
  styleUrl: './product-form-page.component.scss',
})
export class ProductFormPageComponent implements OnInit {
  private readonly productsApi = inject(ProductsApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  productId: string | null = null;
  loading = false;
  categories = [
    { label: 'Bebidas', value: 'beverages' },
    { label: 'Snacks', value: 'snacks' },
    { label: 'Otros', value: 'others' },
  ];

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    sku: [''],
    category: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    description: [''],
    isActive: [true],
  });

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id');
    if (this.productId) {
      this.loadProduct(this.productId);
    }
  }

  loadProduct(id: string): void {
    this.loading = true;
    this.productsApi.getProductById(id).subscribe({
      next: (response) => {
        const product = response.result as Product;
        this.form.patchValue({
          name: product.name,
          sku: product.sku ?? '',
          category: product.category ?? '',
          price: product.price ?? 0,
          description: product.description ?? '',
          isActive: product.isActive ?? true,
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dto = this.form.getRawValue();
    this.loading = true;

    const request$ = this.productId
      ? this.productsApi.updateProduct(this.productId, dto)
      : this.productsApi.createProduct(dto);

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/products']);
      },
      error: () => {
        this.loading = false;
      },
    });
  }
}
