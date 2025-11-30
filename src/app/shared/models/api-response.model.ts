export interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  result: T;
  error: any;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}
