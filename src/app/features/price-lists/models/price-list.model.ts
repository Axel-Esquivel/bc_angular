export interface PriceListItem {
  variantId: string;
  price: number;
  currency?: string;
  minQuantity?: number;
  customerSegment?: string;
  channel?: string;
  discountPercentage?: number;
}

export interface PriceList {
  id: string;
  name: string;
  description?: string;
  items: PriceListItem[];
  OrganizationId: string;
  companyId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePriceListPayload {
  name: string;
  description?: string;
  items: PriceListItem[];
  OrganizationId: string;
  companyId: string;
}

export interface UpdatePriceListPayload {
  name?: string;
  description?: string;
  items?: PriceListItem[];
  OrganizationId?: string;
  companyId?: string;
}

