import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { VariantsApiService } from '../../../../core/api/variants-api.service';
import { Product } from '../../../../shared/models/product.model';
import { ProductVariant } from '../../../../shared/models/product-variant.model';

export interface ProductFormVariantPayload {
  name: string;
  sku?: string;
  barcodes: string[];
  uomId: string;
  price: number;
  minStock: number;
  sellable: boolean;
}

export interface ProductFormSubmit {
  product: {
    name: string;
    category?: string;
    isActive: boolean;
  };
  defaultVariant: ProductFormVariantPayload;
  variants: ProductFormVariantPayload[];
}

type VariantFormGroup = FormGroup<{
  name: FormControl<string>;
  sku: FormControl<string>;
  barcodes: FormControl<string>;
  uomId: FormControl<string>;
  price: FormControl<number>;
  minStock: FormControl<number>;
  sellable: FormControl<boolean>;
}>;

@Component({
  selector: 'bc-product-form',
  standalone: false,
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss'],
})
export class ProductFormComponent implements OnInit, OnChanges, OnDestroy {
  @Input() product: Product | null = null;
  @Input() enableVariants = false;
  @Input() saving = false;

  @Output() save = new EventEmitter<ProductFormSubmit>();
  @Output() cancel = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly variantsApi = inject(VariantsApiService);
  private readonly destroy$ = new Subject<void>();
  private defaultVariantNameEdited = false;
  private suppressDefaultNameSync = false;

  variants: ProductVariant[] = [];
  variantsLoading = false;

  readonly categoryOptions = [
    { label: 'General', value: 'general' },
    { label: 'Servicios', value: 'services' },
    { label: 'Electrónica', value: 'electronics' },
  ];

  readonly productForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    category: [''],
    isActive: [true],
  });

  readonly defaultVariantForm = this.fb.nonNullable.group({
    name: [''],
    sku: [''],
    barcodes: [''],
    uomId: ['unit', [Validators.required]],
    price: [0, [Validators.required, Validators.min(0)]],
    minStock: [0, [Validators.min(0)]],
  });

  readonly variantsFormArray = new FormArray<VariantFormGroup>([]);

  ngOnInit(): void {
    this.productForm.controls.name.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      if (this.defaultVariantNameEdited) {
        return;
      }
      const next = value?.trim();
      if (!next) {
        return;
      }
      this.suppressDefaultNameSync = true;
      this.defaultVariantForm.controls.name.setValue(next, { emitEvent: false });
      this.defaultVariantForm.controls.name.markAsPristine();
      this.suppressDefaultNameSync = false;
    });

    this.defaultVariantForm.controls.name.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      if (this.suppressDefaultNameSync) {
        return;
      }
      if (value && value.trim().length > 0) {
        this.defaultVariantNameEdited = true;
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product']) {
      this.initializeForProduct(this.product);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.productForm.invalid || this.defaultVariantForm.invalid) {
      this.productForm.markAllAsTouched();
      this.defaultVariantForm.markAllAsTouched();
      this.variantsFormArray.controls.forEach((group) => group.markAllAsTouched());
      return;
    }

    const product = this.productForm.getRawValue();
    const defaultName = this.defaultVariantForm.controls.name.value || product.name;
    const defaultVariant: ProductFormVariantPayload = {
      name: defaultName,
      sku: this.defaultVariantForm.controls.sku.value || undefined,
      barcodes: this.ensureBarcodes(this.parseBarcodes(this.defaultVariantForm.controls.barcodes.value)),
      uomId: this.defaultVariantForm.controls.uomId.value,
      price: this.defaultVariantForm.controls.price.value,
      minStock: this.defaultVariantForm.controls.minStock.value,
      sellable: true,
    };

    const variants = this.variantsFormArray.controls.map((group) => {
      const value = group.getRawValue();
      return {
        name: value.name,
        sku: value.sku?.trim() || undefined,
        barcodes: this.ensureBarcodes(this.parseBarcodes(value.barcodes)),
        uomId: value.uomId,
        price: value.price,
        minStock: value.minStock,
        sellable: value.sellable,
      };
    });

    this.save.emit({ product, defaultVariant, variants });
  }

  onCancel(): void {
    this.cancel.emit();
  }

  openVariantCreate(): void {
    if (!this.enableVariants) {
      return;
    }
    this.variantsFormArray.push(this.createVariantGroup());
  }

  removeVariant(index: number): void {
    this.variantsFormArray.removeAt(index);
  }

  private initializeForProduct(product: Product | null): void {
    this.defaultVariantNameEdited = false;
    this.productForm.reset({
      name: product?.name ?? '',
      category: product?.category ?? '',
      isActive: product?.isActive ?? true,
    });
    this.defaultVariantForm.reset({
      name: product?.name ?? '',
      sku: '',
      barcodes: '',
      uomId: 'unit',
      price: 0,
      minStock: 0,
    });
    this.variants = [];
    this.variantsFormArray.clear();

    if (product?.id) {
      this.loadVariants(product.id);
    }
  }

  private loadVariants(productId: string): void {
    this.variantsLoading = true;
    this.variantsApi.getByProduct(productId).subscribe({
      next: (response) => {
        this.variants = response.result ?? [];
        const defaultVariant = this.variants[0] ?? null;
        if (defaultVariant) {
          this.defaultVariantForm.patchValue({
            name: defaultVariant.name ?? '',
            sku: defaultVariant.sku ?? '',
            barcodes: defaultVariant.barcodes?.join(', ') ?? '',
            uomId: defaultVariant.uomId ?? 'unit',
            price: defaultVariant.price ?? 0,
            minStock: defaultVariant.minStock ?? 0,
          });
          if (defaultVariant.name) {
            this.defaultVariantNameEdited = true;
          }
        }
        this.variantsLoading = false;
      },
      error: () => {
        this.variants = [];
        this.variantsLoading = false;
      },
    });
  }

  private createVariantGroup(): VariantFormGroup {
    return this.fb.nonNullable.group({
      name: ['', [Validators.required]],
      sku: [''],
      barcodes: [''],
      uomId: ['unit', [Validators.required]],
      price: [0, [Validators.required, Validators.min(0)]],
      minStock: [0, [Validators.min(0)]],
      sellable: [true],
    });
  }

  private parseBarcodes(value: string): string[] {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  private ensureBarcodes(values: string[]): string[] {
    if (values.length > 0) {
      return values;
    }
    return [this.generateInternalBarcode()];
  }

  private generateInternalBarcode(): string {
    const suffix = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
    return `INT-${suffix}`;
  }
}
