/**
 * Pagination helpers for TanStack Query.
 *
 * Provides consistent cursor-based and offset-based pagination patterns
 * used across all list query hooks.
 */

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
}

export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CursorPage<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Converts PaginationParams to URL query params for offset-based endpoints.
 */
export function paginationParams(params?: PaginationParams): Record<string, string | number | boolean | undefined> {
  if (!params) return {};
  return {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 25,
    ...(params.sortBy ? { sortBy: params.sortBy } : {}),
    ...(params.sortOrder ? { sortOrder: params.sortOrder } : {}),
  };
}

/**
 * Converts CursorPaginationParams to URL query params for cursor-based endpoints.
 * Cursor-based pagination is preferred for event streams and real-time lists.
 */
export function cursorParams(params?: CursorPaginationParams): Record<string, string | number | boolean | undefined> {
  if (!params) return {};
  return {
    ...(params.cursor ? { cursor: params.cursor } : {}),
    limit: params.limit ?? 50,
  };
}
