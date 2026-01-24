import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';

import { CompaniesApiService } from '../api/companies-api.service';
import { WorkspaceModulesOverview } from '../../shared/models/workspace-modules.model';

@Injectable({ providedIn: 'root' })
export class WorkspaceModulesService {
  private readonly overviewSubject = new BehaviorSubject<WorkspaceModulesOverview | null>(null);

  readonly overview$: Observable<WorkspaceModulesOverview | null> = this.overviewSubject.asObservable();

  constructor(private readonly companiesApi: CompaniesApiService) {}

  load(workspaceId: string): Observable<WorkspaceModulesOverview> {
    return this.companiesApi.getModules(workspaceId).pipe(
      map((response) => {
        if (!response?.result) {
          throw new Error('Workspace modules response is empty');
        }
        return response.result;
      }),
      tap((result) => {
        this.overviewSubject.next(result);
      })
    );
  }

  clear(): void {
    this.overviewSubject.next(null);
  }
}
