import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ChipModule } from 'primeng/chip';

import { ModulesApiService } from '../../../../core/api/modules-api.service';
import { ModuleInfo } from '../../../../shared/models/module.model';

@Component({
  selector: 'app-modules-page',
  standalone: true,
  imports: [CommonModule, CardModule, TableModule, ButtonModule, TagModule, ChipModule],
  templateUrl: './modules-page.component.html',
  styleUrl: './modules-page.component.scss',
})
export class ModulesPageComponent implements OnInit {
  private readonly modulesApi = inject(ModulesApiService);
  private readonly processingModules = new Set<string>();

  modules: ModuleInfo[] = [];
  loading = false;

  ngOnInit(): void {
    this.loadModules();
  }

  loadModules(): void {
    this.loading = true;
    this.modulesApi.getModules().subscribe({
      next: (response) => {
        this.modules = response.result ?? [];
        this.loading = false;
      },
      error: () => {
        this.modules = [];
        this.loading = false;
      },
    });
  }

  toggleModule(module: ModuleInfo): void {
    this.processingModules.add(module.name);

    const request$ = module.enabled
      ? this.modulesApi.uninstallModule(module.name)
      : this.modulesApi.installModule(module.name);

    request$.subscribe({
      next: () => {
        this.processingModules.delete(module.name);
        this.loadModules();
      },
      error: () => {
        this.processingModules.delete(module.name);
      },
    });
  }

  isProcessing(name: string): boolean {
    return this.processingModules.has(name);
  }

  hasMissingDependencies(module: ModuleInfo): boolean {
    return (module.missingDependencies?.length ?? 0) > 0;
  }
}
