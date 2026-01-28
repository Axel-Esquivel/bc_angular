export interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  result: T;
  error: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}
