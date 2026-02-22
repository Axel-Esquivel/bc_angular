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
import { ConfirmationService, MessageService, TreeNode } from 'primeng/api';
import { Select } from 'primeng/select';
import { TreeSelect } from 'primeng/treeselect';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { CategoryCreateFormComponent, CategoryCreateFormPayload } from '../category-create-form/category-create-form.component';
import { UomCategoryCreateFormComponent, UomCategoryCreateFormPayload } from '../uom-category-create-form/uom-category-create-form.component';
import { UomUnitCreateFormComponent, UomUnitCreateFormPayload } from '../uom-unit-create-form/uom-unit-create-form.component';
import { PackagingNameCreateFormComponent, PackagingNameCreateFormPayload } from '../packaging-name-create-form/packaging-name-create-form.component';

import {
  CreateProductCategoryPayload,
  ProductCategoriesApiService,
  ProductCategoryTreeNode,
} from '../../../../core/api/product-categories-api.service';
import { PackagingNamesApiService } from '../../../../core/api/packaging-names-api.service';
import { ProductPackaging, ProductPackagingApiService } from '../../../../core/api/product-packaging-api.service';
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
  id?: string;
  name: string;
  unitsPerPack: number;
  price: number;
  barcode?: string;
  internalBarcode?: string;
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
  deletedVariantIds?: string[];
  deletedPackagingIds?: string[];
}

type VariantFormGroup = FormGroup<{
  id: FormControl<string>;
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
  id: FormControl<string>;
  name: FormControl<string>;
  unitsPerPack: FormControl<number>;
  price: FormControl<number>;
  barcode: FormControl<string>;
  internalBarcode: FormControl<string>;
  isActive: FormControl<boolean>;
}>;

type SkuControlHolder = {
  controls: {
    sku: FormControl<string>;
  };
};

interface OptionItem {
  label: string;
  value: string;
}

type ProductFormGroup = FormGroup<{
  name: FormControl<string>;
  categoryNode: FormControl<TreeNode | null>;
  isActive: FormControl<boolean>;
}>;

@Component({
  selector: 'app-product-form',
  standalone: false,
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss'],
  providers: [MessageService, ConfirmationService],
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
  @ViewChild(CategoryCreateFormComponent) categoryCreateForm?: CategoryCreateFormComponent;
  @ViewChild(UomCategoryCreateFormComponent) uomCategoryCreateForm?: UomCategoryCreateFormComponent;
  @ViewChild(UomUnitCreateFormComponent) uomUnitCreateForm?: UomUnitCreateFormComponent;
  @ViewChild(PackagingNameCreateFormComponent) packagingNameCreateForm?: PackagingNameCreateFormComponent;

  private readonly fb = inject(FormBuilder);
  private readonly variantsApi = inject(VariantsApiService);
  private readonly categoriesApi = inject(ProductCategoriesApiService);
  private readonly packagingApi = inject(ProductPackagingApiService);
  private readonly packagingNamesApi = inject(PackagingNamesApiService);
  private readonly uomApi = inject(UomApiService);
  private readonly activeContextState = inject(ActiveContextStateService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroy$ = new Subject<void>();
  private defaultVariantNameEdited = false;
  private suppressDefaultNameSync = false;
  private selectedVariantIndex: number | null = null;
  private selectedPackagingIndex: number | null = null;
  private pendingCategoryId: string | null = null;
  private readonly packagingGenerating = new Set<number>();
  private readonly deletedVariantIds = new Set<string>();
  private readonly deletedPackagingIds = new Set<string>();
  private readonly variantSkuGenerating = new Set<string>();
  private defaultVariantId: string | null = null;
  uomUnitDialogCategoryId: string | null = null;
  private packagingSource: ProductPackaging[] = [];

  variants: ProductVariant[] = [];
  variantsLoading = false;
  categoryTree: TreeNode[] = [];
  uomCategoryOptions: OptionItem[] = [];
  uomOptionsByCategory = new Map<string, OptionItem[]>();
  uomUnitById = new Map<string, UomUnit>();
  uomUnits: UomUnit[] = [];
  packagingNameOptions: OptionItem[] = [];

  readonly productForm: ProductFormGroup = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    categoryNode: new FormControl<TreeNode | null>(null),
    isActive: this.fb.nonNullable.control(true),
  });

  readonly defaultVariantForm = this.fb.nonNullable.group({
    name: [''],
    sku: ['', [Validators.pattern(/^\d*$/)]],
    barcodes: [''],
    uomCategoryId: ['', [Validators.required]],
    uomId: ['', [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(0.01)]],
    minStock: [0, [Validators.min(0)]],
  });

  readonly variantsFormArray = new FormArray<VariantFormGroup>([]);
  readonly packagingFormArray = new FormArray<PackagingFormGroup>([]);
  readonly showSystemPackagingsControl = new FormControl<boolean>(false, { nonNullable: true });

  categoryCreateVisible = false;
  uomCategoryCreateVisible = false;
  uomUnitCreateVisible = false;
  packagingNameCreateVisible = false;
  savingCategory = false;
  savingUomCategory = false;
  savingUomUnit = false;
  savingPackagingName = false;


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

    this.showSystemPackagingsControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.applyPackagingFilter();
    });

    this.loadCategories();
    this.loadUomCategories();
    this.loadPackagingNames();
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
    const categoryId = this.resolveTreeNodeId(rawProduct.categoryNode);
    const product = {
      name: rawProduct.name,
      category: categoryId || undefined,
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
        id: value.id?.trim() || undefined,
        name: value.name?.trim() ?? '',
        unitsPerPack: value.unitsPerPack,
        price: value.price,
        barcode: value.barcode?.trim() || undefined,
        internalBarcode: value.internalBarcode?.trim() || undefined,
        isActive: value.isActive,
      };
    });
    const normalizedPackaging = packaging.filter((item) => this.isPackagingPayloadValid(item));

    const deletedVariantIds = Array.from(this.deletedVariantIds);
    const deletedPackagingIds = Array.from(this.deletedPackagingIds);
    this.save.emit({
      product,
      defaultVariant,
      variants,
      packaging: normalizedPackaging,
      deletedVariantIds: deletedVariantIds.length > 0 ? deletedVariantIds : undefined,
      deletedPackagingIds: deletedPackagingIds.length > 0 ? deletedPackagingIds : undefined,
    });
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
    this.categoryCreateVisible = true;
    queueMicrotask(() => this.categoryCreateForm?.reset());
  }

  handleCategorySave(payload: CategoryCreateFormPayload): void {
    if (this.savingCategory) {
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
    const request: CreateProductCategoryPayload = {
      name: payload.name.trim(),
      parentId: payload.parentId ?? undefined,
      organizationId,
    };
    this.savingCategory = true;
    this.categoriesApi
      .create(request)
      .pipe(
        finalize(() => {
          this.savingCategory = false;
        }),
      )
      .subscribe({
      next: (response) => {
        const created = response.result;
        this.loadCategories();
        if (created?.id) {
          const node = this.findCategoryNode(created.id);
          this.productForm.controls.categoryNode.setValue(node);
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
    this.uomCategoryCreateVisible = true;
    queueMicrotask(() => this.uomCategoryCreateForm?.reset());
  }

  handleUomCategorySave(payload: UomCategoryCreateFormPayload): void {
    if (this.savingUomCategory) {
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
    const request: CreateUomCategoryPayload = {
      name: payload.name.trim(),
      organizationId,
    };
    this.savingUomCategory = true;
    this.uomApi
      .createCategory(request)
      .pipe(
        finalize(() => {
          this.savingUomCategory = false;
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
    this.uomUnitDialogCategoryId = target.uomCategoryId.value || null;
    this.uomUnitCreateVisible = true;
    queueMicrotask(() => this.uomUnitCreateForm?.reset());
  }

  handleUomUnitSave(payload: UomUnitCreateFormPayload): void {
    if (this.savingUomUnit) {
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
    const categoryId = payload.categoryId?.trim();
    if (!categoryId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'UoM',
        detail: 'Selecciona una categoria UoM.',
      });
      return;
    }
    const request: CreateUomUnitPayload = {
      name: payload.name.trim(),
      symbol: payload.symbol.trim(),
      factor: payload.factor,
      categoryId,
      organizationId,
    };
    this.savingUomUnit = true;
    this.uomApi
      .createUnit(request)
      .pipe(
        finalize(() => {
          this.savingUomUnit = false;
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
    this.onRemoveVariant(index);
  }

  onRemoveVariant(index: number, ev?: Event): void {
    ev?.stopPropagation();
    this.confirmationService.confirm({
      header: 'Eliminar variante',
      message: '¿Seguro que deseas eliminar esta variante?',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const group = this.variantsFormArray.at(index);
        if (!group) {
          return;
        }
        const id = group.controls.id.value?.trim();
        if (id) {
          this.deletedVariantIds.add(id);
        }
        this.variantsFormArray.removeAt(index);
      },
    });
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

  openCreatePackagingName(index?: number, event?: Event): void {
    event?.stopPropagation();
    this.selectedPackagingIndex = index ?? null;
    this.packagingNameCreateVisible = true;
    queueMicrotask(() => this.packagingNameCreateForm?.reset());
  }

  handlePackagingNameSave(payload: PackagingNameCreateFormPayload): void {
    if (this.savingPackagingName) {
      return;
    }
    const organizationId = this.getOrganizationId();
    if (!organizationId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto',
        detail: 'Selecciona una organizacion antes de crear nombres de empaque.',
      });
      return;
    }
    const request = { organizationId, name: payload.name.trim() };
    this.savingPackagingName = true;
    this.packagingNamesApi
      .create(request)
      .pipe(
        finalize(() => {
          this.savingPackagingName = false;
        }),
      )
      .subscribe({
        next: (response) => {
          const created = response.result;
          this.loadPackagingNames();
          if (created?.id) {
            this.setPackagingName(created.name);
          }
          this.packagingNameCreateVisible = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Empaques',
            detail: 'Nombre de empaque creado correctamente.',
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Empaques',
            detail: 'No se pudo crear el nombre de empaque.',
          });
        },
      });
  }

  removePackagingRow(index: number): void {
    const group = this.packagingFormArray.at(index);
    if (group) {
      const id = group.controls.id.value?.trim();
      if (id) {
        this.deletedPackagingIds.add(id);
      }
    }
    this.packagingFormArray.removeAt(index);
  }

  onAddPackagingNameClick(event: Event, index: number, select: Select): void {
    event.preventDefault();
    event.stopPropagation();
    select.hide();
    queueMicrotask(() => this.openCreatePackagingName(index));
  }

  generatePackagingInternalBarcode(index: number): void {
    const organizationId = this.getOrganizationId();
    if (!organizationId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto',
        detail: 'Selecciona una organizacion para generar el codigo interno.',
      });
      return;
    }
    const group = this.packagingFormArray.at(index);
    if (!group) {
      return;
    }
    const current = group.controls.internalBarcode.value?.trim();
    if (current) {
      return;
    }
    if (this.packagingGenerating.has(index)) {
      return;
    }
    this.packagingGenerating.add(index);
    this.packagingApi
      .generateInternalBarcode(organizationId)
      .pipe(
        finalize(() => {
          this.packagingGenerating.delete(index);
        }),
      )
      .subscribe({
        next: (response) => {
          const code = response.result?.internalBarcode;
          if (code) {
            group.controls.internalBarcode.setValue(code);
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Empaques',
            detail: 'No se pudo generar el codigo interno.',
          });
        },
      });
  }

  isPackagingGenerating(index: number): boolean {
    return this.packagingGenerating.has(index);
  }

  isVariantSkuGenerating(index?: number): boolean {
    return this.variantSkuGenerating.has(this.getVariantSkuKey(index));
  }

  generateDefaultVariantSku(): void {
    this.generateVariantSkuForGroup(
      this.defaultVariantForm,
      this.defaultVariantId ?? undefined,
      this.getVariantSkuKey(),
    );
  }

  generateVariantSku(index: number): void {
    const group = this.variantsFormArray.at(index);
    if (!group) {
      return;
    }
    const variantId = group.controls.id.value || undefined;
    this.generateVariantSkuForGroup(group, variantId, this.getVariantSkuKey(index));
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
    this.pendingCategoryId = product?.category ?? null;
    this.deletedVariantIds.clear();
    this.deletedPackagingIds.clear();
    this.productForm.reset({
      name: product?.name ?? '',
      categoryNode: null,
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
    this.packagingSource = [];
    this.showSystemPackagingsControl.setValue(false, { emitEvent: false });
    this.defaultVariantId = null;
    if (!product?.id) {
      this.packagingFormArray.push(this.createPackagingGroup());
    }

    this.applyCategorySelection();

    if (product?.id) {
      this.loadCategories();
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
        this.applyCategorySelection();
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
          this.defaultVariantId = defaultVariant.id ?? null;
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
        this.packagingSource = response.result ?? [];
        this.applyPackagingFilter();
      },
      error: () => {
        this.packagingFormArray.clear();
        this.packagingSource = [];
      },
    });
  }

  private createVariantGroup(): VariantFormGroup {
    return this.fb.nonNullable.group({
      id: [''],
      name: ['', [Validators.required]],
      sku: ['', [Validators.pattern(/^\d*$/)]],
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
      id: [''],
      name: ['', [Validators.required]],
      unitsPerPack: [0, [Validators.required, Validators.min(1)]],
      price: [0, [Validators.required, Validators.min(0)]],
      barcode: [''],
      internalBarcode: [''],
      isActive: [true],
    });
  }
  private isPackagingPayloadValid(payload: PackagingPayload): boolean {
    const name = payload.name?.trim();
    if (!name) {
      return false;
    }
    if (!payload.unitsPerPack || payload.unitsPerPack <= 0) {
      return false;
    }
    return true;
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

  private findCategoryNode(id: string): TreeNode | null {
    const stack = [...this.categoryTree];
    while (stack.length > 0) {
      const current = stack.shift();
      if (!current) {
        continue;
      }
      if (current.key === id) {
        return current;
      }
      if (current.children && current.children.length > 0) {
        stack.push(...current.children);
      }
    }
    return null;
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

  private loadPackagingNames(): void {
    const organizationId = this.getOrganizationId();
    if (!organizationId) {
      this.packagingNameOptions = [];
      return;
    }
    this.packagingNamesApi.list(organizationId).subscribe({
      next: (response) => {
        const names = response.result ?? [];
        this.packagingNameOptions = names
          .filter((item) => item.isActive)
          .map((item) => ({ label: item.name, value: item.name }));
      },
      error: () => {
        this.packagingNameOptions = [];
      },
    });
  }

  private setPackagingName(name: string): void {
    if (this.selectedPackagingIndex === null || this.selectedPackagingIndex === undefined) {
      if (this.packagingFormArray.length > 0) {
        this.packagingFormArray.at(0).controls.name.setValue(name);
      }
      return;
    }
    const group = this.packagingFormArray.at(this.selectedPackagingIndex);
    if (group) {
      group.controls.name.setValue(name);
    }
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

  private applyCategorySelection(): void {
    if (!this.pendingCategoryId || this.categoryTree.length === 0) {
      return;
    }
    const node = this.findCategoryNode(this.pendingCategoryId);
    this.productForm.controls.categoryNode.setValue(node, { emitEvent: false });
  }

  private applyPackagingFilter(): void {
    const showSystem = this.showSystemPackagingsControl.value;
    const list = showSystem
      ? this.packagingSource
      : this.packagingSource.filter((item) => !item.systemCreated);
    this.packagingFormArray.clear();
    if (list.length === 0) {
      return;
    }
    list.forEach((item) => {
      const group = this.createPackagingGroup();
      group.patchValue({
        id: item.id ?? '',
        name: item.name,
        unitsPerPack: item.unitsPerPack,
        price: item.price,
        barcode: item.barcode ?? '',
        internalBarcode: item.internalBarcode ?? '',
        isActive: item.isActive,
      });
      this.packagingFormArray.push(group);
    });
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

  private getVariantSkuKey(index?: number): string {
    return index === undefined ? 'default' : `variant-${index}`;
  }

  private generateVariantSkuForGroup(group: SkuControlHolder, variantId: string | undefined, key: string): void {
    const skuControl = group.controls.sku;
    const current = skuControl.value?.trim();
    if (current) {
      return;
    }
    if (this.variantSkuGenerating.has(key)) {
      return;
    }
    const context = this.activeContextState.getActiveContext();
    const organizationId = context.organizationId ?? undefined;
    const enterpriseId = context.enterpriseId ?? undefined;
    if (!organizationId || !enterpriseId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Contexto',
        detail: 'Selecciona una organizacion antes de generar el SKU.',
      });
      return;
    }
    this.variantSkuGenerating.add(key);
    this.variantsApi
      .generateInternalSku({ organizationId, enterpriseId, variantId })
      .pipe(
        finalize(() => {
          this.variantSkuGenerating.delete(key);
        }),
      )
      .subscribe({
        next: (response) => {
          const sku = response.result?.sku;
          if (sku) {
            skuControl.setValue(sku);
          }
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'SKU',
            detail: 'No se pudo generar el SKU interno.',
          });
        },
      });
  }
}
