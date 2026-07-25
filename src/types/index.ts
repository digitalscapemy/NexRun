// Base types that are shared across the application
// Prisma-generated types will be available from @/generated/prisma

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

// Pagination types
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
