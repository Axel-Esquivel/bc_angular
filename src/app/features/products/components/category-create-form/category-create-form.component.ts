import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { TreeNode } from 'primeng/api';
import { TreeSelect } from 'primeng/treeselect';

type CategoryCreateFormGroup = FormGroup<{
  name: FormControl<string>;
  parentNode: FormControl<TreeNode | null>;
}>;

export interface CategoryCreateFormPayload {
  name: string;
  parentId?: string | null;
}

@Component({
  selector: 'app-category-create-form',
  standalone: false,
  templateUrl: './category-create-form.component.html',
  styleUrls: ['./category-create-form.component.scss'],
})
export class CategoryCreateFormComponent implements OnChanges {
  @Input() loading = false;
  @Input() categoryTree: TreeNode[] = [];

  @Output() save = new EventEmitter<CategoryCreateFormPayload>();
  @Output() cancel = new EventEmitter<void>();

  @ViewChild('parentSelect') private parentSelect?: TreeSelect;

  private readonly fb = inject(FormBuilder);

  readonly form: CategoryCreateFormGroup = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    parentNode: new FormControl<TreeNode | null>(null),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categoryTree']) {
      this.form.controls.parentNode.setValue(this.form.controls.parentNode.value);
    }
  }

  reset(): void {
    this.form.reset({ name: '', parentNode: null });
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onSave(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.save.emit({
      name: raw.name.trim(),
      parentId: this.resolveParentId(raw.parentNode),
    });
  }

  hideOverlay(): void {
    this.parentSelect?.hide();
  }

  private resolveParentId(node: TreeNode | null): string | null {
    if (!node) {
      return null;
    }
    if (typeof node.key === 'string' && node.key.trim().length > 0) {
      return node.key;
    }
    const data = node.data as { id?: string } | undefined;
    if (data?.id && data.id.trim().length > 0) {
      return data.id;
    }
    return null;
  }
}
