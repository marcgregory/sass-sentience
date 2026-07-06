# v1.5.1 — Core Entity Management: Estates + Sites

## Current State

| Layer | Estates | Sites |
|-------|---------|-------|
| **Database** | ✅ Table exists, seeded with 4 estates | ✅ Table exists, seeded with 8 sites |
| **Shared types** | ✅ `Estate` interface in `@sentience/types` | ✅ `Site` interface in `@sentience/types` |
| **Permissions** | ✅ Resources in matrix, sidebar nav items exist | ✅ Same |
| **Query keys** | ✅ Defined in `query-keys.ts` | ✅ Defined in `query-keys.ts` |
| **Backend API** | ❌ No route file | ❌ No route file |
| **Frontend lib** | ❌ No `lib/estates.ts` | ❌ No `lib/sites.ts` |
| **Frontend hooks** | ❌ No `use-estates.ts` | ❌ No `use-sites.ts` |
| **Frontend page** | ⚠️ Hardcoded 5-estate array | ⚠️ Hardcoded 5-site array |

## Implementation Steps

### Step 1 — Backend: `apps/api/src/routes/estates.ts`

Create a new route file following the devices.ts pattern:

- `GET /api/estates` — List estates with:
  - Search by name/address/region (ilike)
  - Pagination (page, limit, offset)
  - Customer data isolation (customer scope)
  - Sorting by name or createdAt
  - Paginated response: `{ data, pagination: { page, limit, total, totalPages } }`

- `GET /api/estates/:id` — Single estate detail
  - Returns 404 if not found
  - Customer isolation check

- `POST /api/estates` — Create estate (requireRole("admin"))
  - Zod schema: name, address, city, region, country, contactName, contactEmail, contactPhone
  - customerId from auth user's JWT or request body for admin
  - Returns created estate

- `PATCH /api/estates/:id` — Update estate (requireRole("admin"))
  - Zod schema: optional fields for all editable properties
  - Returns updated estate

- `DELETE /api/estates/:id` — Delete estate (requireRole("admin"))
  - Check for existing sites before deleting (return 409 if sites exist)
  - Returns `{ success: true }`

### Step 2 — Backend: `apps/api/src/routes/sites.ts`

- `GET /api/sites` — List sites with:
  - Optional `estate_id` filter (equality)
  - Search by name
  - Pagination
  - Customer isolation (via estates.customerId join)
  
- `GET /api/sites/:id` — Single site detail
  - Returns estate name alongside site data

- `POST /api/sites` — Create site (requireRole("admin"))
  - Zod schema: name, estateId, address, buildingCount, floorCount, roomCount

- `PATCH /api/sites/:id` — Update site (requireRole("admin"))

- `DELETE /api/sites/:id` — Delete site (requireRole("admin"))
  - Check for existing devices before deleting (return 409)
  - Update parent estate's `siteCount` after deletion

### Step 3 — Backend: Register routes in `apps/api/src/index.ts`

Add:
```ts
import { estateRoutes } from "./routes/estates";
import { siteRoutes } from "./routes/sites";

await app.register(estateRoutes, { prefix: "/api/estates" });
await app.register(siteRoutes, { prefix: "/api/sites" });
```

### Step 4 — Frontend: `apps/web/src/lib/estates.ts`

Create API client functions:

```ts
export interface EstateApiItem { /* matches DB schema + API response */ }
export interface EstateListResponse { data: EstateApiItem[]; pagination: {...} }
export function getEstates(params?): Promise<EstateListResponse>
export function getEstate(id: string): Promise<EstateApiItem>
export function createEstate(payload): Promise<EstateApiItem>
export function updateEstate(id: string, payload): Promise<EstateApiItem>
export function deleteEstate(id: string): Promise<void>
```

### Step 5 — Frontend: `apps/web/src/lib/sites.ts`

Same pattern: `getSites`, `getSite`, `createSite`, `updateSite`, `deleteSite`.

### Step 6 — Frontend: Update `apps/web/src/lib/index.ts`

Export all new functions and types.

### Step 7 — Frontend: `apps/web/src/hooks/use-estates.ts`

```ts
export function useEstates(params?: EstateListParams) — TanStack Query
export function useEstate(id: string)
export function useCreateEstate() — useMutation with invalidation
export function useUpdateEstate() — useMutation with invalidation
export function useDeleteEstate() — useMutation with invalidation
```

### Step 8 — Frontend: `apps/web/src/hooks/use-sites.ts`

Same pattern for sites.

### Step 9 — Frontend: Rewrite `apps/web/src/app/(dashboard)/estates/page.tsx`

Replace the hardcoded 5-item array with:

- **Page uses `useEstates()`** to fetch from API
- **Loading state** — Grid of skeleton cards (same as reports pattern)
- **Error state** — Error card with retry button
- **Empty state** — EmptyState component with CTA to add first estate
- **"Add Estate" button** — Opens a modal dialog with form:
  - Name, Address, City, Region, Country, Contact Name, Email, Phone
  - Form validation
  - API mutation with success/error feedback
- **Estate cards** — Same card layout but data from API
- **Click to expand** — Detail view or quick stats popover
- **Delete action** — Confirmation dialog → API call → invalidation
- **Responsive** — Grid layout: 1 col mobile, 2 tablet, 3 desktop

### Step 10 — Frontend: Rewrite `apps/web/src/app/(dashboard)/sites/page.tsx`

- **Uses `useSites()`** with optional estate filter
- **"Add Site" button** — Dialog with:
  - Name, Estate (dropdown from `useEstates()`), Address, buildings/floors/rooms
- **Site cards** — Same layout but data from API
- **Estate filter** — Dropdown to filter by estate
- **Search** — Text search across site names
- **All states** — Loading/error/empty with skeletons, error card, EmptyState
- **Delete with confirmation** — Prevent if devices exist

### Step 11 — Build verification

Run `pnpm lint && pnpm build` to verify zero TypeScript errors.

## Files to Create

```
apps/api/src/routes/estates.ts        (new)
apps/api/src/routes/sites.ts           (new)
apps/web/src/lib/estates.ts            (new)
apps/web/src/lib/sites.ts              (new)
apps/web/src/hooks/use-estates.ts      (new)
apps/web/src/hooks/use-sites.ts        (new)
```

## Files to Modify

```
apps/api/src/index.ts                  (register routes)
apps/web/src/lib/index.ts              (export new functions)
apps/web/src/app/(dashboard)/estates/page.tsx  (rewrite)
apps/web/src/app/(dashboard)/sites/page.tsx    (rewrite)
```

## Not in Scope

- Simulator mode for estates/sites (no live overlay needed — these are static entities)
- Estate detail page (`/estates/[id]`) — future enhancement
- Site detail page (`/sites/[id]`) — future enhancement
- Tenant-level data isolation improvements beyond what seed data provides
- E2E tests for estates/sites (will be added in v1.6.0)
