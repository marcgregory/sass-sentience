export type ApiKeyStatus = "active" | "expired" | "revoked";

export interface ApiKey {
  id: string;
  name: string;
  maskedKey: string;
  /** Full key shown only on creation */
  fullKey?: string;
  status: ApiKeyStatus;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdBy: string;
  /** Number of requests using this key (placeholder for future analytics) */
  requestCount: number;
}
