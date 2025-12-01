export interface DailySalesReport {
  date: string;
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
}

export interface InventoryReportItem {
  productId: string;
  productName: string;
  sku?: string;
  warehouseName: string;
  currentStock: number;
  reservedStock?: number;
  availableStock: number;
}

export interface ReportFilterParams {
  startDate?: string;
  endDate?: string;
  warehouseId?: string;
  search?: string;
}
