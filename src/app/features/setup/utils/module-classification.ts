export type ModuleVisibility = 'app' | 'internal';

const INTERNAL_MODULE_KEYS = new Set<string>([
  'stock',
  'stock-movements',
  'locations',
  'outbox',
  'inventory-events',
  'inventory-adjustments',
  'inventory-counts',
  'stock-reservations',
  'transfers',
]);

export function applyModuleUiMeta<T extends { key: string; visibility?: ModuleVisibility }>(
  module: T
): T & { visibility: ModuleVisibility } {
  const visibility: ModuleVisibility = INTERNAL_MODULE_KEYS.has(module.key) ? 'internal' : 'app';
  return { ...module, visibility };
}
