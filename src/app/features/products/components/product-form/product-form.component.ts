import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MessageService, TreeNode } from 'primeng/api';
import { Select } from 'primeng/select';
import { TreeSelect } from 'primeng/treeselect';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import {
  CreateProductCategoryPayload,
  ProductCategoriesApiService,
  ProductCategoryTreeNode,
} from '../../../../core/api/product-categories-api.service';
import { ProductPackagingApiService } from '../../../../core/api/product-packaging-api.service';
import {
  CreateUomCategoryPayload,
  CreateUomUnitPayload,
  UomApiService,
  UomCategory,
  UomUnit,
} from '../../../../core/api/uom-api.service';
import { VariantsApiService } from '../../../../core/api/variants-api.service';
import { ActiveContextStateService } from '../../../../core/context/active-context-state.service';
import { Product } from '../../../../shared/models/product.model';
import { ProductVariant } from '../../../../shared/models/product-variant.model';

export interface ProductFormVariantPayload {
  name: string;
  sku?: string;
  barcodes: string[];
  uomCategoryId?: string;
  uomId: string;
  quantity: number;
  minStock: number;
  sellable: boolean;
}

export interface PackagingPayload {
  name: string;
  unitsPerPack: number;
  price: number;
  barcode?: string;
  isActive?: boolean;
}

export interface ProductFormSubmit {
  product: {
    name: string;
    category?: string;
    isActive: boolean;
  };
  defaultVariant: ProductFormVariantPayload;
  variants: ProductFormVariantPayload[];
  packaging: PackagingPayload[];
}

type VariantFormGroup = FormGroup<{
  name: FormControl<string>;
  sku: FormControl<string>;
  barcodes: FormControl<string>;
  uomCategoryId: FormControl<string>;
  uomId: FormControl<string>;
  quantity: FormControl<number>;
  minStock: FormControl<number>;
  sellable: FormControl<boolean>;
}>;

type PackagingFormGroup = FormGroup<{
  name: FormControl<string>;
  unitsPerPack: FormControl<number>;
  price: FormControl<number>;
  barcode: FormControl<string>;
  isActive: FormControl<boolean>;
}>;

interface OptionItem {
  label: string;
  value: string;
}

type CategoryCreateFormGroup = FormGroup<{
  name: FormControl<string>;
  parentNode: FormControl<TreeNode | null>;
}>;

type UomCategoryCreateFormGroup = FormGroup<{
  name: FormControl<string>;
}>;

type UomUnitCreateFormGroup = FormGroup<{
  name: FormControl<string>;
  symbol: FormControl<string>;
  factor: FormControl<number>;
  categoryId: FormControl<string>;
}>;

@Component({
  selector: 'bc-product-form',
  standalone: false,
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss'],
  providers: [MessageService],
})
export class ProductFormComponent implements OnInit, OnChanges, OnDestroy {
  @Input() product: Product | null = null;
  @Input() enableVariants = false;
  @Input() saving = false;

  @Output() save = new EventEmitter<ProductFormSubmit>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('categorySelect') private categorySelect?: TreeSelect;
  @ViewChild('uomCategorySelect') private uomCategorySelect?: Select;
  @ViewChild('uomUnitSelect') private uomUnitSelect?: Select;

  private readonly fb = inject(FormBuilder);
  private readonly variantsApi = inject(VariantsApiService);
  private readonly categoriesApi = inject(ProductCategoriesApiService);
  private readonly packagingApi = inject(ProductPackagingApiService);
  private readonly uomApi = inject(UomApiService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();
  private defaultVariantNameEdited = false;
  private suppressDefaultNameSync = false;
  private selectedVariantIndex: number | null = null;

  variants: ProductVariant[] = [];
  variantsLoading = false;
  categoryTree: TreeNode[] = [];
  uomCategoryOptions: OptionItem[] = [];
  uomOptionsByCategory = new Map<string, OptionItem[]>();
  uomUnitById = new Map<string, UomUnit>();
  uomUnits: UomUnit[] = [];

  readonly productForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    categoryId: [''],
    isActive: [true],
  });

  readonly defaultVariantForm = this.fb.nonNullable.group({
    name: [''],
    sku: [''],
    barcodes: [''],
    uomCategoryId: ['', [Validators.required]],
    uomId: ['', [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(0.01)]],
    minStock: [0, [Validators.min(0)]],
  });

  readonly variantsFormArray = new FormArray<VariantFormGroup>([]);
  readonly packagingFormArray = new FormArray<PackagingFormGroup>([]);

  categoryCreateVisible = false;
  uomCategoryCreateVisible = false;
  uomUnitCreateVisible = false;
  savingCategory = false;
  savingUomCategory = false;
  savingUomUnit = false;

  readonly categoryCreateForm: CategoryCreateFormGroup = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    parentNode: new FormControl<TreeNode | null>(null),
  });

  readonly uomCategoryCreateForm: UomCategoryCreateFormGroup = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
  });

  readonly uomUnitCreateForm: UomUnitCreateFormGroup = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    symbol: ['', [Validators.required]],
    factor: [1, [Validators.required, Validators.min(0.000001)]],
    categoryId: ['', [Validators.required]],
  });

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

    this.defaultVariantForm.controls.uomCategoryId.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((categoryId) => {
      this.defaultVariantForm.controls.uomId.setValue('');
      if (categoryId) {
        this.loadUomUnits(categoryId);
      }
    });

    this.loadCategories();
    this.loadUomCategories();
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
      this.packagingFormArray.controls.forEach((group) => group.markAllAsTouched());
      this.showValidationMessage();
      return;
    }

    const rawProduct = this.productForm.getRawValue();
    const product = {
      name: rawProduct.name,
      category: rawProduct.categoryId || undefined,
      isActive: rawProduct.isActive,
    };
    const defaultName = this.defaultVariantForm.controls.name.value || product.name;
    const defaultVariant: ProductFormVariantPayload = {
      name: defaultName,
      sku: this.defaultVariantForm.controls.sku.value || undefined,
      barcodes: this.ensureBarcodes(this.parseBarcodes(this.defaultVariantForm.controls.barcodes.value)),
      uomCategoryId: this.defaultVariantForm.controls.uomCategoryId.value || undefined,
      uomId: this.defaultVariantForm.controls.uomId.value,
      quantity: this.defaultVariantForm.controls.quantity.value,
      minStock: this.defaultVariantForm.controls.minStock.value,
      sellable: true,
    };

    const variants = this.variantsFormArray.controls.map((group) => {
      const value = group.getRawValue();
      return {
        name: value.name,
        sku: value.sku?.trim() || undefined,
        barcodes: this.ensureBarcodes(this.parseBarcodes(value.barcodes)),
        uomCategoryId: value.uomCategoryId || undefined,
        uomId: value.uomId,
        quantity: value.quantity,
        minStock: value.minStock,
        sellable: value.sellable,
      };
    });

    const packaging = this.packagingFormArray.controls.map((group) => {
      const value = group.getRawValue();
      return {
        name: value.name,
        unitsPerPack: value.unitsPerPack,
        price: value.price,
        barcode: value.barcode?.trim() || undefined,
        isActive: value.isActive,
      };
    });

    const normalizedPackaging = packaging.length > 0 ? packaging : [this.createDefaultPackaging()];

    this.save.emit({ product, defaultVariant, variants, packaging: normalizedPackaging });
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

  onAddCategoryClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.categorySelect?.hide();
    queueMicrotask(() => this.openCreateCategory());
  }

  onAddUomCategoryClick(event: Event, index?: number, select?: Select): void {
    event.preventDefault();
    event.stopPropagation();
    (select ?? this.uomCategorySelect)?.hide();
    queueMicrotask(() => this.openCreateUomCategory(index));
  }

  onAddUomUnitClick(event: Event, index?: number, select?: Select): void {
    event.preventDefault();
    event.stopPropagation();
    (select ?? this.uomUnitSelect)?.hide();
    queueMicrotask(() => this.openCreateUomUnit(index));
  }

  openCreateCategory(event?: Event): void {
    event?.stopPropagation();
    this.categoryCreateForm.reset({ name: '', parentNode: null });
    this.categoryCreateVisible = true;
  }

  saveCategory(): void {
    if (this.savingCategory || this.categoryCreateForm.invalid) {
      this.categoryCreateForm.markAllAsTouched();
      return;
    }
    const organizationId = this.getOrganizationId();
    if (!organizationId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto',
        detail: 'Selecciona una organizacion antes de crear categorias.',
      });
      return;
    }
    const raw = this.categoryCreateForm.getRawValue();
    const parentId = this.resolveTreeNodeId(raw.parentNode);
    const payload: CreateProductCategoryPayload = {
      name: raw.name.trim(),
      parentId,
      organizationId,
    };
    this.savingCategory = true;
    this.categoryCreateForm.disable({ emitEvent: false });
    this.categoriesApi
      .create(payload)
      .pipe(
        finalize(() => {
          this.savingCategory = false;
          this.categoryCreateForm.enable({ emitEvent: false });
        }),
      )
      .subscribe({
      next: (response) => {
        const created = response.result;
        this.loadCategories();
        if (created?.id) {
          this.productForm.controls.categoryId.setValue(created.id);
        }
        this.categoryCreateVisible = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Categoria',
          detail: 'Categoria creada correctamente.',
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Categoria',
          detail: 'No se pudo crear la categoria.',
        });
      },
    });
  }

  openCreateUomCategory(index?: number, event?: Event): void {
    event?.stopPropagation();
    this.selectedVariantIndex = index ?? null;
    this.uomCategoryCreateForm.reset({ name: '' });
    this.uomCategoryCreateVisible = true;
  }

  saveUomCategory(): void {
    if (this.savingUomCategory || this.uomCategoryCreateForm.invalid) {
      this.uomCategoryCreateForm.markAllAsTouched();
      return;
    }
    const organizationId = this.getOrganizationId();
    if (!organizationId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto',
        detail: 'Selecciona una organizacion antes de crear categorias UoM.',
      });
      return;
    }
    const raw = this.uomCategoryCreateForm.getRawValue();
    const payload: CreateUomCategoryPayload = {
      name: raw.name.trim(),
      organizationId,
    };
    this.savingUomCategory = true;
    this.uomCategoryCreateForm.disable({ emitEvent: false });
    this.uomApi
      .createCategory(payload)
      .pipe(
        finalize(() => {
          this.savingUomCategory = false;
          this.uomCategoryCreateForm.enable({ emitEvent: false });
        }),
      )
      .subscribe({
      next: (response) => {
        const created = response.result;
        this.loadUomCategories();
        if (created?.id) {
          this.setTargetUomCategory(created.id);
        }
        this.uomCategoryCreateVisible = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Categoria UoM',
          detail: 'Categoria UoM creada correctamente.',
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Categoria UoM',
          detail: 'No se pudo crear la categoria UoM.',
        });
      },
    });
  }

  openCreateUomUnit(index?: number, event?: Event): void {
    event?.stopPropagation();
    this.selectedVariantIndex = index ?? null;
    const target = this.getUomTargetControls();
    const categoryId = target.uomCategoryId.value;
    this.uomUnitCreateForm.reset({
      name: '',
      symbol: '',
      factor: 1,
      categoryId: categoryId || '',
    });
    this.uomUnitCreateVisible = true;
  }

  saveUomUnit(): void {
    if (this.savingUomUnit || this.uomUnitCreateForm.invalid) {
      this.uomUnitCreateForm.markAllAsTouched();
      return;
    }
    const organizationId = this.getOrganizationId();
    if (!organizationId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto',
        detail: 'Selecciona una organizacion antes de crear unidades.',
      });
      return;
    }
    const raw = this.uomUnitCreateForm.getRawValue();
    const categoryId = raw.categoryId?.trim();
    if (!categoryId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'UoM',
        detail: 'Selecciona una categoria UoM.',
      });
      return;
    }
    const payload: CreateUomUnitPayload = {
      name: raw.name.trim(),
      symbol: raw.symbol.trim(),
      factor: raw.factor,
      categoryId,
      organizationId,
    };
    this.savingUomUnit = true;
    this.uomUnitCreateForm.disable({ emitEvent: false });
    this.uomApi
      .createUnit(payload)
      .pipe(
        finalize(() => {
          this.savingUomUnit = false;
          this.uomUnitCreateForm.enable({ emitEvent: false });
        }),
      )
      .subscribe({
      next: (response) => {
        const created = response.result;
        this.loadUomUnits(categoryId);
        if (created?.id) {
          this.setTargetUomUnit(created.id, categoryId);
        }
        this.uomUnitCreateVisible = false;
        this.messageService.add({
          severity: 'success',
          summary: 'UoM',
          detail: 'Unidad creada correctamente.',
        });
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'UoM',
          detail: 'No se pudo crear la unidad.',
        });
      },
    });
  }

  removeVariant(index: number): void {
    this.variantsFormArray.removeAt(index);
  }

  onVariantCategoryChange(group: VariantFormGroup): void {
    group.controls.uomId.setValue('');
    const categoryId = group.controls.uomCategoryId.value;
    if (categoryId) {
      this.loadUomUnits(categoryId);
    }
  }

  addPackagingRow(name?: string, unitsPerPack?: number): void {
    const group = this.createPackagingGroup();
    if (name) {
      group.controls.name.setValue(name);
    }
    if (unitsPerPack) {
      group.controls.unitsPerPack.setValue(unitsPerPack);
    }
    this.packagingFormArray.push(group);
  }

  removePackagingRow(index: number): void {
    this.packagingFormArray.removeAt(index);
  }

  getUomOptions(categoryId: string): OptionItem[] {
    return this.uomOptionsByCategory.get(categoryId) ?? [];
  }

  getMeasurementPreview(
    quantity: number | null | undefined,
    uomId: string | null | undefined,
  ): string {
    if (!quantity || quantity <= 0 || !uomId) {
      return '';
    }
    const unit = this.uomUnits.find((entry) => entry.id === uomId);
    const symbol = unit?.symbol || unit?.name || uomId;
    const formattedQuantity = Number.isInteger(quantity) ? quantity.toString() : quantity.toString();
    return `${formattedQuantity} ${symbol}`;
  }

  formatVariantMeasure(control: AbstractControl): string {
    const group = control as VariantFormGroup;
    const quantity = group.controls.quantity.value;
    const uomId = group.controls.uomId.value;
    if (!uomId || !quantity || quantity <= 0) {
      return '—';
    }
    const label = this.resolveUomLabel(uomId) ?? uomId;
    const formatted = Number.isInteger(quantity) ? `${quantity}` : quantity.toFixed(2);
    return `${formatted} ${label}`.trim();
  }

  resolveUomLabel(uomId: string): string | null {
    const unit = this.uomUnitById.get(uomId);
    if (!unit) {
      return null;
    }
    const symbol = unit.symbol?.trim();
    if (symbol) {
      return symbol;
    }
    return unit.name?.trim() || null;
  }

  private initializeForProduct(product: Product | null): void {
    this.defaultVariantNameEdited = false;
    this.productForm.reset({
      name: product?.name ?? '',
      categoryId: product?.category ?? '',
      isActive: product?.isActive ?? true,
    });
    this.defaultVariantForm.reset({
      name: product?.name ?? '',
      sku: '',
      barcodes: '',
      uomCategoryId: '',
      uomId: '',
      quantity: 1,
      minStock: 0,
    });
    this.variants = [];
    this.variantsFormArray.clear();
    this.packagingFormArray.clear();
    this.packagingFormArray.push(this.createPackagingGroup());

    if (product?.id) {
      this.loadVariants(product.id);
    }
  }

  private loadCategories(): void {
    const organizationId = this.getOrganizationId() ?? undefined;
    if (!organizationId) {
      this.categoryTree = [];
      return;
    }
    this.categoriesApi.getTree(organizationId).subscribe({
      next: (response) => {
        const raw = response.result ?? [];
        this.categoryTree = this.mapTreeNodes(raw);
      },
      error: () => {
        this.categoryTree = [];
      },
    });
  }

  private loadUomCategories(): void {
    const organizationId = this.getOrganizationId() ?? undefined;
    if (!organizationId) {
      this.uomCategoryOptions = [];
      return;
    }
    this.uomApi.getCategories(organizationId).subscribe({
      next: (response) => {
        const categories = response.result ?? [];
        this.uomCategoryOptions = categories.map((category: UomCategory) => ({
          label: category.name,
          value: category.id,
        }));
      },
      error: () => {
        this.uomCategoryOptions = [];
      },
    });
  }

  private loadUomUnits(categoryId: string): void {
    const organizationId = this.getOrganizationId() ?? undefined;
    if (!organizationId) {
      this.uomOptionsByCategory.set(categoryId, []);
      return;
    }
    this.uomApi.getUnits(organizationId, categoryId).subscribe({
      next: (response) => {
        const units = response.result ?? [];
        this.uomUnits = units;
        units.forEach((unit: UomUnit) => {
          this.uomUnitById.set(unit.id, unit);
        });
        const options = units.map((unit: UomUnit) => ({
          label: unit.symbol ? `${unit.name} (${unit.symbol})` : unit.name,
          value: unit.id,
        }));
        this.uomOptionsByCategory.set(categoryId, options);
      },
      error: () => {
        this.uomOptionsByCategory.set(categoryId, []);
      },
    });
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
            uomCategoryId: defaultVariant.uomCategoryId ?? '',
            uomId: defaultVariant.uomId ?? '',
            quantity: defaultVariant.quantity ?? 1,
            minStock: defaultVariant.minStock ?? 0,
          });
          if (defaultVariant.uomCategoryId) {
            this.loadUomUnits(defaultVariant.uomCategoryId);
          }
          this.loadPackaging(defaultVariant.id);
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

  private loadPackaging(variantId: string): void {
    this.packagingApi.listByVariant(variantId).subscribe({
      next: (response) => {
        const packaging = response.result ?? [];
        this.packagingFormArray.clear();
        if (packaging.length === 0) {
          this.packagingFormArray.push(this.createPackagingGroup());
          return;
        }
        packaging.forEach((item) => {
          const group = this.createPackagingGroup();
          group.patchValue({
            name: item.name,
            unitsPerPack: item.unitsPerPack,
            price: item.price,
            barcode: item.barcode ?? '',
            isActive: item.isActive,
          });
          this.packagingFormArray.push(group);
        });
      },
      error: () => {
        this.packagingFormArray.clear();
        this.packagingFormArray.push(this.createPackagingGroup());
      },
    });
  }

  private createVariantGroup(): VariantFormGroup {
    return this.fb.nonNullable.group({
      name: ['', [Validators.required]],
      sku: [''],
      barcodes: [''],
      uomCategoryId: ['', [Validators.required]],
      uomId: ['', [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      minStock: [0, [Validators.min(0)]],
      sellable: [true],
    });
  }

  private createPackagingGroup(): PackagingFormGroup {
    return this.fb.nonNullable.group({
      name: ['Unidad', [Validators.required]],
      unitsPerPack: [1, [Validators.required, Validators.min(1)]],
      price: [0, [Validators.required, Validators.min(0)]],
      barcode: [''],
      isActive: [true],
    });
  }

  private createDefaultPackaging(): PackagingPayload {
    return { name: 'Unidad', unitsPerPack: 1, price: 0, isActive: true };
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

  private mapTreeNodes(nodes: ProductCategoryTreeNode[]): TreeNode[] {
    return nodes.map((node) => ({
      key: node.id,
      label: node.name,
      data: node,
      children: this.mapTreeNodes(node.children ?? []),
    }));
  }

  private showValidationMessage(): void {
    const needsMeasure =
      this.defaultVariantForm.controls.uomCategoryId.invalid ||
      this.defaultVariantForm.controls.uomId.invalid ||
      this.defaultVariantForm.controls.quantity.invalid;
    if (!needsMeasure) {
      return;
    }
    this.messageService.add({
      severity: 'warn',
      summary: 'Validación',
      detail: 'Completa la medida (categoría, unidad y cantidad).',
    });
  }

  private resolveTreeNodeId(node: TreeNode | null): string | null {
    if (!node) {
      return null;
    }
    if (typeof node.key === 'string' && node.key.trim().length > 0) {
      return node.key;
    }
    const data = node.data as ProductCategoryTreeNode | undefined;
    if (data && typeof data.id === 'string' && data.id.trim().length > 0) {
      return data.id;
    }
    return null;
  }

  private getOrganizationId(): string | null {
    const context = this.activeContextState.getActiveContext();
    return context.organizationId ?? null;
  }

  private getUomTargetControls(): { uomCategoryId: FormControl<string>; uomId: FormControl<string> } {
    if (this.selectedVariantIndex === null || this.selectedVariantIndex === undefined) {
      return {
        uomCategoryId: this.defaultVariantForm.controls.uomCategoryId,
        uomId: this.defaultVariantForm.controls.uomId,
      };
    }
    const group = this.variantsFormArray.at(this.selectedVariantIndex);
    return { uomCategoryId: group.controls.uomCategoryId, uomId: group.controls.uomId };
  }

  private setTargetUomCategory(categoryId: string): void {
    const target = this.getUomTargetControls();
    target.uomCategoryId.setValue(categoryId);
    target.uomId.setValue('');
    this.loadUomUnits(categoryId);
  }

  private setTargetUomUnit(uomId: string, categoryId: string): void {
    const target = this.getUomTargetControls();
    target.uomCategoryId.setValue(categoryId);
    target.uomId.setValue(uomId);
  }
}
