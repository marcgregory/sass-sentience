# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. Read it first to understand the architecture, conventions, and constraints before making changes.

---

## Commands

```bash
pnpm dev          # Start all workspaces in dev mode (turbo)
pnpm build        # Production build (turbo)
pnpm lint         # TypeScript check across all packages
pnpm clean        # Clean build artifacts
pnpm --filter @sentience/web dev     # Dev server for just the Next.js app
pnpm --filter @sentience/web build   # Build just the Next.js app
pnpm --filter @sentience/web lint    # TypeScript check for the Next.js app
```

Platform: Windows (PowerShell or Git Bash). Use `pnpm` (v10.14.0), Node >=18.

---

## Engineering Principles

- **Prefer extending existing patterns** over introducing new ones. If the codebase uses a pattern (page structure, state management, component composition), follow it.
- **Reuse existing components** before creating new ones. Check `apps/web/src/components/shared/` and the shadcn/ui kit first.
- **Keep pages thin** — move business logic into hooks (`apps/web/src/hooks/`) and services (`apps/web/src/lib/`).
- **Do not duplicate domain types or utilities** — import from `@sentience/types` and `@sentience/utils`.
- **Favor incremental improvements** over architectural rewrites. Small, safe changes compound faster than ground-up rebuilds.

---

## Architecture

### Monorepo (pnpm workspaces + Turborepo)

```
sass/
├── apps/web/              # Next.js 15 App Router — the main application
├── packages/
│   ├── types/             # @sentience/types — shared domain types (no deps)
│   ├── utils/             # @sentience/utils — cn(), formatters, constants
│   ├── ui/                # @sentience/ui — reserved for shared UI components
│   ├── hooks/             # @sentience/hooks — reusable React hooks
│   ├── mock/              # @sentience/mock — Faker-based mock data generators
│   └── config/            # @sentience/config — shared Tailwind preset, TS config
```

All internal packages use `workspace:*` protocol and are transpiled by Next.js via `transpilePackages`.

### Route Groups & Layouts

```
app/
├── layout.tsx              # Root: Providers (Theme + Query), Inter font, globals.css
├── page.tsx                # Redirects to /login
├── (auth)/                 # Public: login, forgot-password, mfa
│   └── layout.tsx (implied — no shared layout, individual full-screen)
└── (dashboard)/            # Authenticated: all app pages
    └── layout.tsx          # DashboardShell (sidebar + header + main area)
```

All 15 dashboard pages live flat under `(dashboard)/`. Dynamic routes (`/devices/[id]`, `/sites/[id]`) are stubbed but not yet built.

### Theme System

CSS variables defined in `globals.css` (`:root` / `.dark`) following shadcn/ui conventions. The `ThemeProvider` reads system preference, stores choice in Zustand (persisted), and toggles the `dark` class on `<html>`. Tailwind colors (`border`, `background`, `card`, etc.) reference the CSS variables.

Status colors are literal Tailwind values (emerald/slate/red/amber) — not CSS variables — so they stay consistent across themes.

### CSS Conventions

- Tailwind utility classes only — no CSS modules, no styled-components.
- shadcn-style color tokens via CSS variables (border, card, muted, etc.).
- Utility classes prefixed with `status-*` defined in `globals.css` (`@layer utilities`).
- Custom animations: `animate-fade-in`, `animate-pulse-dot`, `animate-slide-in-right`.

---

## Architecture Rules

These are non-negotiable constraints. Do not deviate without documenting the decision in `docs/adr/`.

### State Management (Never Mix Concerns)

| Concern | Tool | Do Not Use |
|---------|------|-----------|
| Server/API state | TanStack Query | Zustand for API data, Redux, MobX, Context state duplication |
| Client/UI state | Zustand | Redux, MobX, Context for UI state |
| Real-time events | Socket.IO → Zustand stores | Polling, WebSocket directly in components |

- **TanStack Query owns server state.** All device/site/estate/alert data queries go through `@tanstack/react-query`. Mutations use optimistic updates.
- **Zustand owns client/UI state.** Auth, UI preferences, and notifications use Zustand stores (`auth-store`, `ui-store`, `notification-store`). Auth and UI preferences are persisted to localStorage via `zustand/middleware/persist`.
- **Socket.IO owns real-time state.** Zustand stores receive events from the Socket.IO client layer (planned). The `notification-store` already has `addNotification` wired for socket feed.
- **Never duplicate server state inside Zustand.** TanStack Query's cache is the single source of truth for API data.
- **Never introduce Redux, MobX, CSS Modules, or styled-components.**
- **Never fetch directly inside page components** when TanStack Query hooks exist.

### Package Boundaries

| Package | Responsibility | Do Not Place Here |
|---------|---------------|-------------------|
| `@sentience/types` | Shared domain types. Zero runtime dependencies. | Classes, logic, or library code |
| `@sentience/utils` | Pure functions — `cn()` (clsx+tailwind-merge), date/time/signal/temp formatters, status/severity color maps. No React. | React components, hooks, JSX |
| `@sentience/ui` | Shared UI components (shadcn/ui patterns) | Page-specific components, business logic |
| `@sentience/hooks` | Reusable React hooks | UI components, page logic |
| `@sentience/mock` | Faker-based mock data generators | Production imports (never imported in production bundles) |
| `@sentience/config` | Shared Tailwind preset, TypeScript config (build-time only) | Runtime code |

### Component Patterns

- **Page pattern**: Every route exports a `"use client"` default component. Pages compose `PageHeader` (title + description + action buttons) followed by content grids/tables. Do not break this pattern.
- **Reuse**: Use existing shared components (`StatusDot`, `EmptyState`, `Badge`, `PageHeader`) before creating new ones.
- **Organization**: New reusable components go in `apps/web/src/components/shared/`. Feature-specific components go in `apps/web/src/components/{feature}/`.
- **Table pattern**: Current device table is hand-crafted HTML (not TanStack Table yet — planned).
- **Empty states**: Use `EmptyState` component with icon, title, description, optional CTA button.
- **Status indicators**: Use `StatusDot` (pulsing for online) or `StatusBadge` (pill with dot + label). `Badge` component supports severity variants: `online`, `offline`, `fault`, `warning`.

### Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Files | kebab-case | `auth-store.ts`, `page-header.tsx` |
| Components | PascalCase | `DashboardShell`, `StatusBadge` |
| Stores | camelCase + "Store" suffix | `useAuthStore`, `useUIStore` |
| Hooks | camelCase + "use" prefix | `useDevices`, `useAlerts` |
| Types (interfaces) | PascalCase | `Device`, `SiteEstate` |
| Types (unions) | camelCase | `DeviceStatus`, `EventSeverity` |

### Shared Type Packages

All domain types live in `@sentience/types` and are imported as:
```ts
import type { Device, DeviceStatus, Site, Alert } from "@sentience/types";
```

The `@sentience/utils` package exports `cn()` (clsx + tailwind-merge), date/time/signal/temp formatters, and status/severity color constant maps.

### RBAC (Stub)

The `auth-store` has `hasRole()` and `hasPermission()` methods. Currently admin always returns true. The 4 roles (`admin`, `support`, `installer`, `customer`) are defined in `UserRole` type. Navigation items are not yet filtered by role — all 13 links show for all users.

---

## Feature Development Workflow

Implement features in this order. Skipping steps causes rework.

1. **Create shared types** — Add interfaces and type aliases to `@sentience/types`.
2. **Create repository/API layer** — Build query functions and API client in `apps/web/src/lib/`.
3. **Create TanStack Query hooks** — Wrap API calls with `useQuery`/`useMutation` in `apps/web/src/hooks/`.
4. **Create reusable UI components** — Build shared components in `apps/web/src/components/shared/` or add to `packages/ui/`.
5. **Build pages** — Compose components using the `PageHeader + content` pattern.
6. **Connect mutations** — Wire form submissions, toggles, and delete actions to TanStack Query mutations with optimistic updates.
7. **Add loading, empty, and error states** — Every data-driven view needs all three.
8. **Verify responsive behavior** — Test at 375px, 768px, and 1280px+.
9. **Run TypeScript, lint, and production build** — `pnpm lint && pnpm build`.

---

## Definition of Done

Every feature must satisfy this checklist before being marked complete:

- **TypeScript compiles cleanly** (`pnpm lint` passes with zero errors).
- **ESLint passes** with zero warnings.
- **Production build succeeds** (`pnpm build`).
- **Dark mode** — renders correctly in both light and dark themes.
- **Loading, empty, and error states** — all data-driven views handle all three.
- **Responsive** — works at 375px, 768px, and 1280px+.
- **Reuses shared components** — no duplicate UI patterns.
- **Follows naming conventions** — kebab-case files, PascalCase components, camelCase stores/hooks.
- **No architectural drift** — follows the state management rules, package boundaries, and page patterns defined above.

---

## Performance Targets

| Target | Goal |
|--------|------|
| Dashboard initial load | <2s |
| Real-time telemetry latency | <500ms |
| Shared JS bundle | <150 kB |
| Socket.IO reconnect | <5s |
| Page transitions (navigation) | <200ms |
| Lighthouse performance score | >90 |

---

## Known Gaps / Next Work

- `@sentience/mock` is scaffolded but has no data generators yet.
- Device detail page (`/devices/[id]`) and site detail (`/sites/[id]`) are stubbed with static data.
- No Socket.IO real-time integration yet.
- No RBAC enforcement on routes or nav items.
- No dynamic route segments (all pages are static).
- Diagnostics tools are UI mocks — no actual ping/MQTT/signal execution.
- No TanStack Query hooks created yet (data is all inline mock/static).
- No export/CSV/PDF backend integration.
- No audit log or notification backend integration.
- No E2E test infrastructure (Playwright/Cypress).

---

## Future Integrations

These sections describe planned integration points and will grow as they are implemented. Reserved for documenting how each integration connects to the existing architecture.

### MQTT

_Not yet started._ Planned as the device ingestion pipeline. Will feed device telemetry (battery, voltage, temperature, signal strength) from field devices into the real-time layer.

### Socket.IO

_Planned._ The `notification-store` has `addNotification()` ready. Will provide auto-reconnecting WebSocket transport with room-based subscriptions (by estate/site/device). Events dispatched from Socket.IO → Zustand store updates → React re-renders.

### REST API

_Not yet started._ The TanStack Query hooks will consume endpoints defined here. Auth uses JWT with refresh token rotation (via next-safe-action).

### CSV / PDF Exports

_Not yet started._ Export buttons exist on Events and Reports pages but are not wired to generation backends.

### Notifications

_UI complete, backend pending._ Notification dropdown in header and full notification list page exist with mock data. Will connect to Socket.IO feed and backend persistence.

### Audit Logging

_Not yet started._ Audit log page is scaffolded with mock data. Will capture user actions (login, CRUD, setting changes) and display in a paginated timeline.

### Feature Flags

_Not yet started._ Planned for the Settings/Admin area to enable/disable features per tenant.

---

## Build Output

All pages are statically generated (pre-rendered static HTML). The shared JS chunk is ~102 kB. First-load JS per page ranges from 102 kB (shared only) to 115 kB (forgot-password with form UI).

```
TypeScript    ✅ Clean
ESLint        ✅ Clean
Build         ✅ Success
Hydration Err 0
Bundle Errors 0
```

---

## Architecture Decision Records

Significant architectural decisions (choosing Zustand over Redux, TanStack Query over SWR, Socket.IO over raw WebSockets, etc.) are documented in `docs/adr/`. This file (`CLAUDE.md`) provides **implementation guidance** and **active constraints**, not design history. When considering a change to the established architecture, read the relevant ADR first to understand the original rationale. If you make a new architectural decision, create a new ADR in `docs/adr/` rather than expanding this file.
