# Sprint 11 — Phase B: Firmware Package Registry

## Summary

Phase B extends the existing `firmware_packages` CRUD with a proper artifact registry:
status lifecycle, audit metadata, integrity reference, and usage visibility.

No file storage, no deployment behavior, no device compatibility engine — those are Phase C/D concerns.

---

## What Already Exists (Phase A)

| Layer | Status | Notes |
|-------|--------|-------|
| DB migration 0010 | ✅ | `firmware_packages` table with id, name, version, device_type, release_notes, file_hash, file_size, timestamps |
| Drizzle schema (`db/schema/rollouts.ts`) | ✅ | `firmwarePackages` table definition |
| API routes (`routes/firmware.ts`) | ✅ | GET list, POST create, GET :id, DELETE :id — all with Zod validation, pagination, audit logging, RBAC |
| API routes (`routes/rollouts.ts`) | ✅ | Full rollout lifecycle including eligibility preview |
| Frontend types (`@sentience/types/firmware.ts`) | ✅ | `FirmwarePackage`, `Rollout`, `RolloutDevice` |
| Frontend API client (`lib/firmware.ts`) | ✅ | `getFirmwarePackages`, `getFirmwarePackage`, `createFirmwarePackage`, `deleteFirmwarePackage` + all rollout functions |
| Frontend hooks (`hooks/use-firmware.ts`) | ✅ | `useFirmwarePackages`, `useFirmwarePackage`, `useCreateFirmwarePackage`, `useDeleteFirmwarePackage` |
| Query keys (`lib/query-keys.ts`) | ✅ | `queryKeys.firmware.{all, list, detail}` |
| RBAC permissions (`lib/permissions.ts`) | ✅ | `firmware` resource with admin=support=manage, others=no access |
| Sidebar nav | ✅ | "/firmware" link, "/rollouts" link |
| List page `/firmware/page.tsx` | ✅ | Card grid, search, pagination, create dialog, delete confirmation |
| Detail page `/firmware/[id]/page.tsx` | ✅ | Package details card, release notes, rollout history placeholder |

---

## What Phase B Adds

### Files Changed/Added

| File | Change | Reason |
|------|--------|--------|
| `apps/api/migrations/0011_*.sql` | **New** | Migration: add `status`, `created_by`, `metadata` columns, FK to users |
| `apps/api/src/db/schema/rollouts.ts` | **Edit** | Add `status`, `createdBy`, `metadata` fields to `firmwarePackages` |
| `apps/api/src/routes/firmware.ts` | **Edit** | Add PATCH, deprecate/activate endpoints; update delete with FK guard |
| `apps/web/src/lib/firmware.ts` | **Edit** | Add `updateFirmwarePackage`, `deprecateFirmwarePackage`, `activateFirmwarePackage` functions |
| `apps/web/src/hooks/use-firmware.ts` | **Edit** | Add `useUpdateFirmwarePackage`, `useDeprecateFirmwarePackage`, `useActivateFirmwarePackage` hooks |
| `apps/web/src/app/(dashboard)/firmware/page.tsx` | **Edit** | Add status filter chips, status badges on cards |
| `apps/web/src/app/(dashboard)/firmware/[id]/page.tsx` | **Edit** | Add status section, deprecate/activate button, metadata display, usage history |
| `packages/types/src/firmware.ts` | **Edit** | Extend `FirmwarePackage` with `status`, `createdBy`, `metadata` |
| `packages/utils/src/constants.ts` | **Edit** | Add status color map for firmware package status |

---

### 1. Database Migration (0011)

Add three columns to `firmware_packages`:

```sql
ALTER TABLE firmware_packages ADD COLUMN status text NOT NULL DEFAULT 'active';
ALTER TABLE firmware_packages ADD COLUMN created_by uuid REFERENCES users(id);
ALTER TABLE firmware_packages ADD COLUMN metadata jsonb DEFAULT '{}';

-- Status constraint
ALTER TABLE firmware_packages ADD CONSTRAINT firmware_packages_status_check
  CHECK (status IN ('active', 'deprecated'));

-- Index on status for filtering
CREATE INDEX firmware_packages_status_idx ON firmware_packages (status);
```

**Design rationale:**
- `status` differentiates `active` (available for rollouts) from `deprecated` (cannot be used in new rollouts, but existing rollouts continue)
- `created_by` enables "Created by user X" on detail page and audit attribution
- `metadata` (JSONB) holds `releaseNotes`, `minimumVersion`, `checksum`, `size` — extensible without schema migrations

---

### 2. Backend: Drizzle Schema Update (`apps/api/src/db/schema/rollouts.ts`)

Add to the `firmwarePackages` table definition:

```typescript
status: text("status", { enum: ["active", "deprecated"] }).notNull().default("active"),
createdBy: uuid("created_by").references(() => users.id),
metadata: jsonb("metadata").default({}),
```

---

### 3. Backend: API Routes — firmware.ts

**New endpoints:**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | `/firmware/:id` | admin, support | Update name, version, deviceType, releaseNotes, fileHash, fileSize, metadata |
| POST | `/firmware/:id/deprecate` | admin, support | Set status = deprecated |
| POST | `/firmware/:id/activate` | admin, support | Set status = active |

**Modified endpoints:**

- **DELETE `/firmware/:id`** — Before deleting, check if any rollouts reference this package via `SELECT 1 FROM rollouts WHERE firmware_package_id = :id LIMIT 1`. If found, return 409 with `code: "HAS_ACTIVE_ROLLOUTS"`.
- **GET `/firmware`** — Add `status` query parameter filter (active/deprecated). Add `status`, `createdBy`, `metadata` to response.
- **POST `/firmware`** — Accept `createdBy` (user ID from JWT). Set default status='active'. Accept `metadata`.

**Updated Zod schemas:**

```typescript
const updateFirmwareSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  version: z.string().min(1).max(64).optional(),
  deviceType: z.array(z.string().min(1)).min(1).max(20).optional(),
  releaseNotes: z.string().max(4096).optional().nullable(),
  fileHash: z.string().max(128).optional().nullable(),
  fileSize: z.number().int().min(0).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const listFirmwareQuerySchema = z.object({
  ...existing,
  status: z.enum(["active", "deprecated"]).optional(),
});
```

---

### 4. Frontend: Types (`packages/types/src/firmware.ts`)

```typescript
export type FirmwarePackageStatus = "active" | "deprecated";

export interface FirmwarePackage {
  // ...existing fields
  status: FirmwarePackageStatus;
  createdBy: string | null;
  metadata: Record<string, unknown> | null;
}
```

---

### 5. Frontend: API Client (`lib/firmware.ts`)

Add functions:

```typescript
export async function updateFirmwarePackage(
  id: string, payload: Partial<CreateFirmwarePackagePayload>
): Promise<FirmwarePackageApiItem>;

export async function deprecateFirmwarePackage(
  id: string
): Promise<FirmwarePackageApiItem>;

export async function activateFirmwarePackage(
  id: string
): Promise<FirmwarePackageApiItem>;
```

---

### 6. Frontend: TanStack Query Hooks (`hooks/use-firmware.ts`)

Add hooks:

```typescript
export function useUpdateFirmwarePackage();
export function useDeprecateFirmwarePackage();
export function useActivateFirmwarePackage();
```

All invalidate `queryKeys.firmware.all` and the specific detail key on success.

---

### 7. Frontend: List Page (`/firmware/page.tsx`)

Changes:
- **Status filter bar** — Button group: All, Active, Deprecated (below search, above card grid)
- **Card status indicator** — Status badge in the top-right corner of each card (green=active, amber=deprecated)
- **Disable delete for deprecated** — Remove delete button from deprecated packages (or show with tooltip "Package has rollouts — cannot delete")
- **Update create form** — No UI change needed; status defaults to active

---

### 8. Frontend: Detail Page (`/firmware/[id]/page.tsx`)

Changes:
- **Status section in Package Details card** — Show status badge with deprecation date. Add "Deprecate" button (if active) and "Reactivate" button (if deprecated), with confirmation dialog
- **Metadata section** — Render metadata key-value pairs if present (releaseNotes as text, checksum as monospace, etc.)
- **Created by** — Show creator name in the detail grid
- **Usage history** — Replace the placeholder "No rollouts yet" with a real query: fetch rollouts referencing this package (`GET /rollouts?firmwarePackageId={id}`) or include it in the GET response. Show a table/card list of rollouts that used this package, with status and date. If none, keep the empty state.

---

### 9. Utils (`packages/utils/src/constants.ts`)

Add:

```typescript
export const FIRMWARE_STATUS_COLORS: Record<string, string> = {
  active: "text-emerald-600",
  deprecated: "text-amber-600",
};
```

---

## Acceptance Criteria

```
✓ Migration 0011 adds status, created_by, metadata to firmware_packages
✓ Status lifecycle: create=active, deprecate→deprecated, reactivate→active
✓ Cannot delete firmware package referenced by existing rollouts (409)
✓ PATCH endpoint for metadata updates
✓ Status filter on list page (All/Active/Deprecated)
✓ Status badge visible on list cards and detail page
✓ Deprecate/activate actions on detail page
✓ Usage history section on detail page (rollouts using this package)
✓ Created-by attribution visible
✓ RBAC enforced (admin/support for mutations, all authenticated for read)
✓ Audit events recorded for deprecate/activate/PATCH
✓ TypeScript compiles cleanly
✓ Production build succeeds

Not in scope:
  - File upload / binary storage
  - Device compatibility engine
  - Rollout scheduling
  - Rollout execution
```
