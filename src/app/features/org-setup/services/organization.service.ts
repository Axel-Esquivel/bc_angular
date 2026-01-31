import { Injectable } from '@angular/core';

import { OrganizationsService } from '../../../core/api/organizations-api.service';

export interface JoinOrganizationPayload {
  codeOrName: string;
}

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  constructor(private readonly organizationsApi: OrganizationsService) {}

  joinOrganization(payload: JoinOrganizationPayload) {
    const code = payload.codeOrName?.trim();
    return this.organizationsApi.requestJoinByCode({ code: code || undefined });
  }
}
