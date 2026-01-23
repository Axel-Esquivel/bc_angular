import { Injectable } from '@angular/core';

import { ModuleDefinition } from '../api/modules-api.service';

export interface DisableCheckResult {
  allowed: boolean;
  requiredBy: string[];
}

export interface EnableWithDepsResult {
  enabled: string[];
  newDependencies: string[];
}

@Injectable({ providedIn: 'root' })
export class ModuleDependenciesService {
  resolveDependencies(moduleId: string, definitions: ModuleDefinition[]): string[] {
    const result = new Set<string>();
    const visited = new Set<string>();
    const definitionMap = new Map(definitions.map((definition) => [definition.id, definition]));

    const visit = (currentId: string) => {
      if (visited.has(currentId)) {
        return;
      }
      visited.add(currentId);
      const definition = definitionMap.get(currentId);
      const deps = definition?.dependencies ?? [];
      deps.forEach((depId) => {
        if (!result.has(depId)) {
          result.add(depId);
        }
        visit(depId);
      });
    };

    visit(moduleId);
    return Array.from(result);
  }

  getDependents(moduleId: string, enabledIds: string[], definitions: ModuleDefinition[]): string[] {
    const dependents = new Set<string>();
    enabledIds.forEach((enabledId) => {
      if (enabledId === moduleId) {
        return;
      }
      const deps = this.resolveDependencies(enabledId, definitions);
      if (deps.includes(moduleId)) {
        dependents.add(enabledId);
      }
    });
    return Array.from(dependents);
  }

  applyEnableWithDeps(
    currentEnabled: string[],
    moduleId: string,
    definitions: ModuleDefinition[]
  ): EnableWithDepsResult {
    const deps = this.resolveDependencies(moduleId, definitions);
    const next = new Set(currentEnabled);
    const newlyEnabled: string[] = [];

    next.add(moduleId);
    deps.forEach((depId) => {
      if (!next.has(depId)) {
        newlyEnabled.push(depId);
      }
      next.add(depId);
    });

    return { enabled: Array.from(next), newDependencies: newlyEnabled };
  }

  canDisable(
    currentEnabled: string[],
    moduleId: string,
    definitions: ModuleDefinition[]
  ): DisableCheckResult {
    const dependents = this.getDependents(moduleId, currentEnabled, definitions);
    return { allowed: dependents.length === 0, requiredBy: dependents };
  }
}
