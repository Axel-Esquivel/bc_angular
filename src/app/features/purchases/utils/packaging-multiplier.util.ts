import { FormControl } from '@angular/forms';

export interface PackagingMultiplierMeta {
  multiplier: number;
  allowCustomMultiplier: boolean;
}

type MultiplierGroup = {
  controls: {
    packagingMultiplier: FormControl<number | null>;
  };
};

export function applyMultiplierState(
  group: MultiplierGroup,
  packaging: PackagingMultiplierMeta | null,
): void {
  const control = group.controls.packagingMultiplier;
  if (!packaging) {
    control.setValue(1, { emitEvent: false });
    control.disable({ emitEvent: false });
    return;
  }
  if (packaging.allowCustomMultiplier) {
    if (!control.value) {
      control.setValue(packaging.multiplier, { emitEvent: false });
    }
    control.enable({ emitEvent: false });
    return;
  }
  control.setValue(packaging.multiplier, { emitEvent: false });
  control.disable({ emitEvent: false });
}
