# ADR-0002: Use TanStack Query for Server State

## Status

Accepted

## Context

The Sentience IoT platform queries and mutates remote data: device lists, estate hierarchies, site details, alert records, event histories, user profiles, and more. This data originates from a REST API (planned, not yet built) and must be cached, synchronized, and invalidated on the client.

The constraints on this decision were:

- Must handle caching with configurable staleness and automatic background refetching.
- Must support optimistic updates for frequent toggle-like mutations (device online/offline, alert acknowledge).
- Must support pagination and infinite scroll for event history lists.
- Must integrate with the real-time layer (Socket.IO) for cache invalidation when external data changes.
- Must work with React Server Components and the SSR/static generation model of Next.js.
- **Must not duplicate server data in Zustand stores** — Zustand is for client/UI state only (see ADR-0001). Server data must not be stored in Zustand.

## Decision

Use TanStack React Query (`@tanstack/react-query`) as the server-state synchronization layer.

- The `QueryProvider` wraps the app in `apps/web/src/providers/query-provider.tsx` with a configured `QueryClient` that sets sensible defaults (staleTime, retry count, refetchOnWindowFocus behavior).
- Future TanStack Query hooks will live in `apps/web/src/hooks/` as `useDevices`, `useDevice`, `useSites`, `useAlerts`, etc.
- Mutations will use optimistic updates where appropriate (status toggles, acknowledge actions) with rollback on error.
- The query cache is the single source of truth for server data — Zustand stores must not duplicate it.

## Consequences

### Positive

- Declarative data fetching — components describe what data they need and let TanStack Query handle caching, deduplication, and background refetching.
- Automatic cache invalidation — mutations can invalidate related queries (e.g., acknowledging an alert invalidates both the alert list and the dashboard KPI count).
- Built-in pagination support — `useInfiniteQuery` handles cursor-based navigation for event history without manual state tracking.
- Optimistic updates — toggle-heavy UIs (device status, alert acknowledge) feel instant by updating the cache before the server confirms, with automatic rollback on failure.
- Cache-first rendering — pages render from cache immediately and refresh in the background, which is critical for dashboard performance targets (<2s load, <500ms telemetry latency).
- Extensive TypeScript support — full type inference on query keys, variables, and return types reduces runtime errors.

### Negative / Tradeoffs

- Adds ~13 kB gzipped to the bundle, bringing the shared JS to ~102 kB. Still within the <150 kB target.
- Query key management requires discipline — inconsistent keys cause cache misses or stale data. The project will use a query key factory pattern in the API client layer.
- SSR/SSG integration adds complexity — queries must be pre-fetched or suppressed during static generation. The current build avoids this by using static pages with client-side fetching.
- Not a replacement for real-time updates — TanStack Query polls or refetches on focus; it does not push. Socket.IO (ADR-0003) is the real-time layer, and it will invalidate TanStack Query caches when external data changes.

## Alternatives Rejected

**SWR.** Rejected because TanStack Query has richer mutation support (optimistic updates, rollback, mutation cache). SWR's mutation API is more manual and less type-safe. TanStack Query's devtools provide better debugging for cache state and query lifecycles. TanStack Query's `useInfiniteQuery` is more mature for cursor-based pagination.

**RTK Query.** Rejected because it is tied to Redux Toolkit, which was already rejected for client state (see ADR-0001). It forces API definitions into a slice/endpoint pattern that is more ceremonial than the function-based approach of TanStack Query. It would reintroduce the bundle overhead of Redux that Zustand was chosen to avoid.

**Manual fetch + useState/useEffect.** Rejected because there is no caching — every component mount fetches fresh data, even if another component already has it. No deduplication means two components requesting the same data fire two network requests. No background refetching means users must manually refresh to see updated data. No optimistic updates means every mutation blocks on the server response, making toggle UIs feel sluggish.

**Pure React Server Components.** Rejected because the app is predominantly interactive (dashboard, device controls, alert actions) and benefits from client-side caching. The real-time layer (Socket.IO) runs on the client and needs to invalidate client-side caches. A hybrid approach (RSC for initial data + TanStack Query for mutations/refetching) is possible but adds architectural complexity not yet justified.
