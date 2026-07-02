/**
 * Shared API client for server data fetching.
 *
 * Wraps fetch with base URL, auth token injection, error normalization,
 * and response parsing. All TanStack Query hooks should use this client
 * rather than calling fetch directly.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestConfig {
  params?: Record<string, string | number | boolean | undefined>;
  headers?: HeadersInit;
  signal?: AbortSignal;
}

/**
 * Resolves an absolute URL or a path relative to API_BASE_URL.
 */
function resolveUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Builds query string from params, skipping undefined values.
 */
function buildQueryString(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null,
  );
  if (entries.length === 0) return "";
  return `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}`;
}

async function getAuthToken(): Promise<string | null> {
  // Dynamic import avoids circular dependency and ensures the store
  // is only accessed on the client where the persist middleware is active.
  try {
    const { useAuthStore } = await import("@/stores/auth-store");
    return useAuthStore.getState().token;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & RequestConfig = {},
): Promise<T> {
  const { params, headers: extraHeaders, ...fetchOptions } = options;
  const url = `${resolveUrl(path)}${buildQueryString(params)}`;

  const token = await getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      body.message ?? response.statusText,
      response.status,
      body.code,
      body.details,
    );
  }

  // Handle 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

/**
 * GET request.
 */
export function get<T>(path: string, config?: RequestConfig): Promise<T> {
  return request<T>(path, { method: "GET", ...config });
}

/**
 * POST request.
 */
export function post<T>(
  path: string,
  body?: unknown,
  config?: RequestConfig,
): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...config,
  });
}

/**
 * PUT request.
 */
export function put<T>(
  path: string,
  body?: unknown,
  config?: RequestConfig,
): Promise<T> {
  return request<T>(path, {
    method: "PUT",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...config,
  });
}

/**
 * PATCH request.
 */
export function patch<T>(
  path: string,
  body?: unknown,
  config?: RequestConfig,
): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...config,
  });
}

/**
 * DELETE request.
 */
export function del<T>(path: string, config?: RequestConfig): Promise<T> {
  return request<T>(path, { method: "DELETE", ...config });
}
