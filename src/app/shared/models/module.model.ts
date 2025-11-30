export interface ModuleInfo {
  name: string;
  description?: string;
  version: string;
  enabled: boolean;
  dependencies: string[];
  resolvedDependencies: string[];
  missingDependencies: string[];
  degraded: boolean;
}
