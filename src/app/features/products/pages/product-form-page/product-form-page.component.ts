import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductsApiService } from '../../../../core/api/products-api.service';
import { Product } from '../../../../shared/models/product.model';
import { ProductFormComponent } from '../../components/product-form/product-form.component';

@Component({
  selector: 'app-product-form-page',
  standalone: false,
  templateUrl: './product-form-page.component.html',
  styleUrl: './product-form-page.component.scss',
})
export class ProductFormPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productsApi = inject(ProductsApiService);

  product: Product | null = null;
  loading = false;
  saving = false;
  isEdit = false;
  loadError = false;

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      this.isEdit = true;
      this.fetchProduct(productId);
    }
  }

  onSubmit(payload: Partial<Product>): void {
    this.isEdit ? this.updateProduct(payload) : this.createProduct(payload);
  }

  onCancel(): void {
    this.router.navigate(['/products']);
  }

  private fetchProduct(id: string): void {
    this.loading = true;
    this.loadError = false;
    this.productsApi.getProductById(id).subscribe({
      next: (response) => {
        this.product = response.result ?? null;
        this.loading = false;
      },
      error: () => {
        this.product = null;
        this.loading = false;
        this.loadError = true;
      },
    });
  }

  private createProduct(payload: Partial<Product>): void {
    this.saving = true;
    this.productsApi.createProduct(payload).subscribe({
      next: () => this.navigateToList(),
      error: () => {
        this.saving = false;
      },
    });
  }

  private updateProduct(payload: Partial<Product>): void {
    if (!this.product?.id) return;

    this.saving = true;
    this.productsApi.updateProduct(this.product.id, payload).subscribe({
      next: () => this.navigateToList(),
      error: () => {
        this.saving = false;
      },
    });
  }

  private navigateToList(): void {
    this.saving = false;
    this.router.navigate(['/products']);
  }
}
