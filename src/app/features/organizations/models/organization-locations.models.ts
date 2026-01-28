export type LocationType = 'branch' | 'warehouse';

export interface InventoryLocation {
  id: string;
  organizationId: string;
  companyId: string;
  name: string;
  type: LocationType;
  createdAt?: string;
}

export interface CreateInventoryLocationPayload {
  name: string;
  type: LocationType;
}
