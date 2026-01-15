import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { SetupApiService } from '../../../core/api/setup-api.service';
import { ModuleInfo } from '../../../shared/models/module.model';

@Component({
  selector: 'app-modules-setup-page',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, Button, ToggleSwitchModule, Toast],
  templateUrl: './modules-setup-page.component.html',
  styleUrl: './modules-setup-page.component.scss',
  providers: [MessageService],
})
export class ModulesSetupPageComponent implements OnInit {
  private readonly setupApi = inject(SetupApiService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly processingModules = new Set<string>();

  modules: ModuleInfo[] = [];
  loading = false;

  ngOnInit(): void {
    this.loadModules();
  }

  loadModules(): void {
    this.loading = true;
    this.setupApi.getModules().subscribe({
      next: (response) => {
        this.modules = response.result ?? [];
        this.loading = false;
      },
      error: () => {
        this.modules = [];
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudieron cargar los modulos de setup.',
        });
      },
    });
  }

  toggleModule(module: ModuleInfo): void {
    this.processingModules.add(module.name);
    const nextState = module.enabled;

    this.setupApi.updateModule({ name: module.name, enabled: nextState }).subscribe({
      next: (response) => {
        module.enabled = response.result?.enabled ?? nextState;
        this.processingModules.delete(module.name);
      },
      error: () => {
        module.enabled = !nextState;
        this.processingModules.delete(module.name);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo actualizar el modulo de setup.',
        });
      },
    });
  }

  continueToLogin(): void {
    void this.router.navigate(['/login']);
  }

  isProcessing(name: string): boolean {
    return this.processingModules.has(name);
  }

  hasMissingDependencies(module: ModuleInfo): boolean {
    return (module.missingDependencies?.length ?? 0) > 0;
  }
}
