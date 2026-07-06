/**
 * Customer API functions.
 *
 * Provides typed functions for fetching customer data from the backend API.
 * Used by TanStack Query hooks — never call these directly from components.
 */

import { get } from "./api-client";

// ─── API Response Types ───────────────────────────────────────────────────

export interface CustomerApiItem {
  id: string;
  name: string;
}

export interface CustomerListResponse {
  data: CustomerApiItem[];
}

// ─── API Functions ────────────────────────────────────────────────────────

export async function getCustomers(): Promise<CustomerListResponse> {
  return get<CustomerListResponse>("/customers");
}
