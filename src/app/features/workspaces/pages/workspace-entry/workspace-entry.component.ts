import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { take } from 'rxjs';

import { WorkspacesApiService } from '../../../../core/api/workspaces-api.service';
import { LoggerService } from '../../../../core/logging/logger.service';

@Component({
  selector: 'app-workspace-entry',
  standalone: true,
  template: '',
})
export class WorkspaceEntryComponent implements OnInit {
  private readonly workspacesApi = inject(WorkspacesApiService);
  private readonly router = inject(Router);
  private readonly logger = inject(LoggerService);

  ngOnInit(): void {
    this.workspacesApi
      .listMine()
      .pipe(take(1))
      .subscribe((response) => {
        const workspaces = response.result?.workspaces ?? [];
        const count = workspaces.length;
        this.logger.debug('[ws-entry] count', count);
        if (count === 0) {
          this.logger.debug('[ws-entry] -> companies select');
          this.router.navigateByUrl('/companies/select');
        }
      });
  }
}
