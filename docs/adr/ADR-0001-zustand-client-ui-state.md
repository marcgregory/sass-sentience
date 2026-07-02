# ADR-0001: Use Zustand for Client/UI State

## Status

Accepted

## Context

The Sentience IoT platform needs to manage client-side state that is neither server-derived nor real-time: UI preferences (sidebar collapsed, theme choice, mobile menu open), authentication tokens and user session, and notification unread counts. This state is transient, local to the browser session, and does not benefit from server cache semantics.

The constraints on this decision were:

- Must support persisting select slices to localStorage (theme preference, auth token).
- Must not add significant bundle overhead — the app targets <150 kB shared JS.
- Must have a simple API with no boilerplate — most stores are 20–50 lines.
- Must integrate cleanly with React Server Components (no provider nesting per store).
- Auth and UI state may need to be read outside React (e.g., in API interceptors or middleware).

## Decision

Use Zustand as the client/UI state management library.

Three stores exist today under `apps/web/src/stores/`:

- `auth-store.ts` — user, roles, permissions, tokens.
- `ui-store.ts` — sidebar state, theme preference, mobile menu.
- `notification-store.ts` — unread count, notification list, socket feed.

Stores that require persistence use Zustand's `persist` middleware targeting localStorage. Auth store data is available outside React via the store's vanilla API (`useAuthStore.getState()`), which is needed for middleware and API interceptors. Each store is a single file — no ceremony, no providers.

## Consequences

### Positive

- Minimal boilerplate — a store is a `create()` call with a single function, not a slice/reducer/action pattern.
- No provider wrapping needed — stores are consumed inline via hooks or imperatively via `.getState()`. This avoids provider nesting in the root layout.
- Bundle size is negligible (~1.5 kB gzipped) compared to alternatives.
- TypeScript inference works out of the box — no extra type annotations needed for store selectors.
- Persist middleware is purpose-built for the use case (selective hydration, versioned migrations).
- Dead-simple to test — stores are functions, call them directly without mounting a component tree.

### Negative / Tradeoffs

- No built-in devtools compared to Redux DevTools (though Zustand has a devtools middleware available).
- No opinion on data normalization — teams must self-enforce discipline on store shape. For this project the stores are small and domain-scoped, so this is not a practical concern.
- Zustand stores that hold domain data can accidentally become a second source of truth if not policed — ADR-0002 (TanStack Query) exists specifically to prevent this.

## Alternatives Rejected

**React Context.** Rejected because Context triggers re-renders on all consumers when any part of the value changes, requiring memoization or splitting into many contexts. Context values cannot be read outside the component tree, which is needed for API interceptors reading the auth token. Every store would need a separate Provider, adding nesting.

**Redux Toolkit.** Rejected because the app has at most 3 small stores — Redux's slice/reducer/selector/dispatch pattern is disproportionate overhead. RTK adds ~12 kB gzipped vs Zustand's ~1.5 kB. The app does not need middleware chains, side-effect sagas, or normalized entity caches that Redux excels at.

**Jotai / Recoil.** Rejected because atomic state works best for highly-interleaved state with many cross-cutting dependencies, which this app doesn't have. The stores are naturally grouped by domain (auth, UI, notifications), not split across atoms. Both add provider wrapping per atom family.

**LocalStorage-only.** Rejected because there is no reactivity — components do not re-render when localStorage changes. String serialization/parsing on every read adds friction. There is no way to derive computed values (e.g., `isAuthenticated` from `user` and `token`).
