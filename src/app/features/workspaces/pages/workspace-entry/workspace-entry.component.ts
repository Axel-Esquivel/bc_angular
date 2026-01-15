import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { take } from 'rxjs';

import { WorkspacesApiService } from '../../../../core/api/workspaces-api.service';

@Component({
  selector: 'app-workspace-entry',
  standalone: true,
  template: '',
})
export class WorkspaceEntryComponent implements OnInit {
  private readonly workspacesApi = inject(WorkspacesApiService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.workspacesApi
      .listMine()
      .pipe(take(1))
      .subscribe((response) => {
        const workspaces = response.result?.workspaces ?? [];
        const count = workspaces.length;
        // eslint-disable-next-line no-console
        console.log('[ws-entry] count', count);
        if (count === 0) {
          // eslint-disable-next-line no-console
          console.log('[ws-entry] -> onboarding');
          this.router.navigateByUrl('/workspaces/onboarding');
        }
      });
  }
}
