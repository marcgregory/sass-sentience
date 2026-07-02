# Sentience IoT Platform — Build Plan

## Overview

Enterprise IoT monitoring platform for 4 user personas (Customer, Installer, Support, Admin) with real-time MQTT telemetry, RBAC, multi-tenant estate management, and operational dashboards.

## Phase 1 — Foundation (Scaffold + Core UI)

Goal: Working monorepo with design system, routing shell, auth, dark mode.

### Step 1.1 — Monorepo scaffold
- `pnpm init` with workspaces
- `apps/web` — Next.js 15 App Router + TypeScript
- `packages/ui` — shadcn/ui component library
- `packages/config` — shared Tailwind, TypeScript configs
- `packages/utils` — shared utilities (cn, formatters, constants)
- `packages/types` — shared TypeScript interfaces
- `packages/mock` — mock data layer (device telemetry, users, estates)

### Step 1.2 — Design system (shadcn/ui)
- Theme provider with CSS variables for light/dark
- Base components: Button, Card, Badge, Input, Select, Table, Dialog, Dropdown, Tabs, Sheet, Tooltip, Avatar, Skeleton, Switch, Separator, Progress
- Dark mode toggle with system preference detection
- Custom theme tokens (status colors: online/offline/fault/warning)

### Step 1.3 — Layout shell
- `RootLayout` with Providers (Theme, Auth, Query, Socket)
- `DashboardLayout` with collapsible sidebar (rail/mobile drawer)
- Sidebar navigation grouped by persona role
- Top header with search, notifications dropdown, user menu
- Breadcrumb trail

### Step 1.4 — Authentication
- JWT token management (store, refresh, intercept)
- Login page with "Remember me"
- Forgot password flow
- MFA setup page (UI mock)
- Auth middleware (route protection by role)
- Auth context + Zustand store

### Step 1.5 — Zustand stores
- `authStore` — user, roles, permissions, tokens
- `uiStore` — sidebar state, theme, mobile menu
- `notificationStore` — unread count, list, socket feed

---

## Phase 2 — Data & API Layer

Goal: Data fetching patterns, mock backend, real-time simulation.

### Step 2.1 — TanStack Query setup
- Query client with defaults (staleTime, retry, refetchOnWindowFocus)
- Infinite query helpers for paginated tables
- Mutation hooks with optimistic updates for status toggles

### Step 2.2 — Mock data layer (`packages/mock`)
- Faker-generated datasets: 3 customers, 5 estates, 15 sites, 200+ devices
- Device telemetry stream (MQTT simulation via setInterval)
- Event history (500+ entries across severity levels)
- Alert generation engine
- User/role/permission matrix

### Step 2.3 — Socket.IO client setup
- Connection manager with auto-reconnect
- Event dispatcher → Zustand store updates
- Subscription scoping (by estate/site/device)

---

## Phase 3 — Core Feature Modules

### Step 3.1 — Dashboard
- KPI row: Total devices, Online, Offline, Faults, Warnings (live-updating)
- System Health gauge chart
- Device status pie/donut chart
- Today's events timeline
- Open alerts by severity
- Recent activity feed
- Responsive widget grid (drag-and-drop optional)

### Step 3.2 — Estate Management
- Estate list with stats cards (devices, alerts, health)
- Estate detail: overview, site list, alerts, reports tabs
- Create/edit estate form (dialog)
- Estate health composite score

### Step 3.3 — Site Management
- Site list per estate
- Site detail: buildings/floors/rooms drill-down
- Device summary by site
- Site map placeholder

### Step 3.4 — Device Management
- Device list: TanStack Table with sorting, filtering, column visibility
- Device detail: tabbed view (Overview, Telemetry, Config, Diagnostics, Logs)
- Status badges (Online/Offline/Fault/Warning) with animated indicators
- Telemetry gauges: battery, voltage, temperature, signal strength
- I/O panel (inputs, relay outputs)
- Device actions: restart, factory reset, configure
- Maintenance history timeline

### Step 3.5 — Alerts
- Alert list with severity color coding
- Real-time alert feed (socket updates)
- Alert detail sidebar
- Acknowledge/Resolve workflow
- Alert rules configuration

### Step 3.6 — Event History
- Timeline with search and multi-facet filters
- Severity, date range, category, device, user
- Paginated with cursor-based navigation
- Export CSV

### Step 3.7 — Reporting
- Report builder: select type (daily/weekly/monthly/custom), date range, metrics
- Generated report preview with charts
- Export CSV / PDF
- Scheduled reports UI

### Step 3.8 — Diagnostics
- Ping test, connection test, MQTT status check
- Signal/battery/firmware checks
- Error code lookup
- Diagnostic report generation (PDF-ready)

### Step 3.9 — User Management & RBAC
- User list with role badges
- Create/invite user dialog
- Role management with permission matrix
- Permission table (resource × action grid)
- User profile page

### Step 3.10 — Notification Center
- Notification dropdown (header)
- Full notification list page
- Category filtering, priority sorting
- Mark read / mark all read
- Empty states for each category

---

## Phase 4 — Portal Customization & Polish

Goal: Persona-specific views, responsive, accessibility.

### Step 4.1 — Role-based navigation
- Admin sees everything + System Health + Audit Logs
- Support sees all customers + Diagnostics + Logs
- Installer sees Sites + Devices + Diagnostics
- Customer sees own estates + reports + users

### Step 4.2 — Responsive & Tablet
- Collapsible sidebar → bottom tab bar on mobile
- Device table → card list on small screens
- Dashboard widgets → single column on mobile

### Step 4.3 — Accessibility
- Focus management in modals/sheets
- ARIA labels on icon-only buttons
- Keyboard navigation for tables
- Color-blind-friendly status indicators (patterns + color)
- Reduced motion support

### Step 4.4 — Settings & Admin
- Tenant settings
- Profile settings (avatar, password, MFA, notifications)
- API key management
- Audit log viewer
- Feature flags

---

## File Structure

```
sass/
├── apps/
│   └── web/
│       ├── public/
│       ├── src/
│       │   ├── app/                    # Next.js App Router
│       │   │   ├── layout.tsx          # Root layout with providers
│       │   │   ├── page.tsx            # Login/redirect
│       │   │   ├── (auth)/             # Auth route group
│       │   │   │   ├── login/
│       │   │   │   ├── forgot-password/
│       │   │   │   └── mfa/
│       │   │   ├── (dashboard)/        # Authenticated routes
│       │   │   │   ├── layout.tsx      # DashboardShell
│       │   │   │   ├── dashboard/
│       │   │   │   ├── estates/
│       │   │   │   ├── sites/
│       │   │   │   ├── devices/
│       │   │   │   ├── alerts/
│       │   │   │   ├── events/
│       │   │   │   ├── reports/
│       │   │   │   ├── diagnostics/
│       │   │   │   ├── users/
│       │   │   │   ├── roles/
│       │   │   │   ├── notifications/
│       │   │   │   ├── audit-log/
│       │   │   │   ├── settings/
│       │   │   │   └── profile/
│       │   │   └── not-found.tsx
│       │   ├── components/
│       │   │   ├── ui/                 # shadcn/ui re-exports
│       │   │   ├── layout/            # Sidebar, Header, Breadcrumbs
│       │   │   ├── dashboard/         # Dashboard widgets
│       │   │   ├── devices/           # Device components
│       │   │   ├── alerts/            # Alert components
│       │   │   ├── reports/           # Report components
│       │   │   ├── users/             # User components
│       │   │   ├── diagnostics/       # Diagnostic components
│       │   │   └── shared/            # Reusable patterns
│       │   ├── hooks/                 # Custom React hooks
│       │   ├── lib/                   # Utilities (api, auth, mqtt)
│       │   ├── providers/             # Context providers
│       │   ├── stores/                # Zustand stores
│       │   └── types/                 # Frontend-specific types
│       ├── tailwind.config.ts
│       ├── next.config.ts
│       └── package.json
├── packages/
│   ├── ui/                            # shadcn/ui + theme tokens
│   │   ├── src/
│   │   │   ├── globals.css            # CSS variables
│   │   │   └── index.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   ├── config/
│   │   ├── tailwind/
│   │   ├── typescript/
│   │   └── package.json
│   ├── hooks/
│   │   └── package.json
│   ├── types/
│   │   ├── src/
│   │   │   ├── device.ts
│   │   │   ├── estate.ts
│   │   │   ├── site.ts
│   │   │   ├── user.ts
│   │   │   ├── alert.ts
│   │   │   ├── event.ts
│   │   │   ├── report.ts
│   │   │   ├── notification.ts
│   │   │   └── index.ts
│   │   └── package.json
│   └── utils/
│       ├── src/
│       │   ├── cn.ts
│       │   ├── formatters.ts
│       │   └── constants.ts
│       └── package.json
├── pnpm-workspace.yaml
├── package.json
├── turbo.json
├── .gitignore
└── README.md
```

---

## Key Design Decisions

| Decision | Choice | Rationale | ADR |
|---|---|---|---|
| State management | Zustand + TanStack Query | Zustand for UI/real-time; Query for server state | [ADR-0001](../docs/adr/ADR-0001-zustand-client-ui-state.md), [ADR-0002](../docs/adr/ADR-0002-tanstack-query-server-state.md) |
| Real-time | Socket.IO client | Native reconnects, room-based subscriptions | [ADR-0003](../docs/adr/ADR-0003-socketio-realtime-events.md) |
| Tables | TanStack Table | Virtual scrolling, column reorder, export |
| Forms | React Hook Form + Zod | Type-safe validation |
| Charts | Recharts | React-native, composable, good for IoT telemetry |
| Styling | Tailwind + shadcn/ui | Design tokens via CSS variables, dark mode |
| Auth | JWT (next-safe-action) | Stateless, refresh token rotation |
| Icons | Lucide React | Consistent, Tree-shakeable |
| Package manager | pnpm | Fast, strict, workspace-native |
| Monorepo | pnpm workspaces + Turborepo | Shared configs, caching |

---

## Status Color System

```ts
status: {
  online:  { bg: 'bg-emerald-500', text: 'text-emerald-500', dot: '🟢' },
  offline: { bg: 'bg-slate-400', text: 'text-slate-400', dot: '⚪' },
  fault:   { bg: 'bg-red-500',   text: 'text-red-500',   dot: '🔴' },
  warning: { bg: 'bg-amber-500', text: 'text-amber-500', dot: '🟡' },
}
```

---

## Implementation Order

The build order follows dependency chains — foundation before features, data layer before UI, simpler CRUD before real-time:

1. Monorepo scaffold + packages
2. Design system + dark mode
3. Layout shell + navigation
4. Authentication + middleware
5. Mock data layer + real-time simulation
6. Dashboard with live KPIs
7. Estate / Site / Device CRUD
8. Device detail + telemetry
9. Alerts system
10. Event history + filters
11. Reports + export
12. Diagnostics
13. User management + RBAC
14. Notification center
15. Admin settings + audit
16. Portal persona customization
17. Responsive polish + accessibility
18. Demo data seeding + README

---

## Developer Handoff — Engineering Checkpoint

---

# Current Architecture Snapshot

## Monorepo

```
apps/
  web/
packages/
  ui/
  config/
  hooks/
  types/
  utils/
  mock/      (scaffolded, no generators yet)
```

## Current State Layer

```
Server State
    │
    ▼
TanStack Query
    │
    ▼
React Components
    ▲
    │
Zustand (UI/Client State)

Future:
MQTT
   │
Socket.IO
   │
Realtime Events
   │
Zustand Store Updates
```

**Status:**

* ✅ TanStack Query provider wired (`providers/query-provider.tsx`)
* ✅ Zustand stores working with persist middleware (`auth-store`, `ui-store`, `notification-store`)
* ⏳ Socket.IO provider — not implemented (listed in build plan, `notification-store` has `addNotification` method ready)
* ⏳ MQTT integration — not connected
* ⏳ TanStack Query hooks — zero data-fetching hooks exist; all pages use inline mock/static arrays

---

# Route Inventory

| Route          | Status       | Notes |
|---------------|-------------|-------|
| `/login`      | ✅ Complete  | Form validation, "Remember me" |
| `/forgot-password` | ✅ Complete | Email input + reset flow |
| `/mfa`        | ✅ Complete  | UI mock, no backend hookup |
| `/dashboard`  | ✅ Scaffolded | Inline mock KPIs, SVG gauges, alert list |
| `/estates`    | ✅ Scaffolded | Mock estate cards |
| `/sites`      | ✅ Scaffolded | Mock site list |
| `/sites/[id]`  | ⏳ Stubbed   | Directory exists, static mock data |
| `/devices`    | ✅ Scaffolded | Hand-crafted HTML table (not TanStack Table) |
| `/devices/[id]` | ⏳ Stubbed  | Directory exists, static mock data |
| `/alerts`     | ✅ Scaffolded | Severity color-coded list |
| `/events`     | ✅ Scaffolded | Timeline with filters, uses real `formatRelativeTime` |
| `/reports`    | ✅ Scaffolded | Report builder preview (mock) |
| `/diagnostics`| ✅ Scaffolded | UI tools mock — no real ping/MQTT/signal execution |
| `/users`      | ✅ Scaffolded | User list with role badges |
| `/roles`      | ✅ Scaffolded | Permission matrix UI |
| `/notifications` | ✅ Scaffolded | Notification list with filters |
| `/audit-log`  | ✅ Scaffolded | Audit log viewer (mock) |
| `/settings`   | ✅ Scaffolded | Tenant/settings UI (mock) |
| `/profile`    | ✅ Scaffolded | User profile (mock) |

---

# Component Inventory

## Layout

| Component     | Status |
|---------------|--------|
| DashboardShell | ✅ Built |
| Sidebar (collapsible, rail mode) | ✅ Built |
| Header (search, notifications, user menu) | ✅ Built |
| Breadcrumbs | ✅ Built |
| ThemeProvider | ✅ Built |

## Shared / Reusable

| Component     | Status |
|---------------|--------|
| PageHeader | ✅ Built |
| StatusDot (pulsing for online) | ✅ Built |
| Badge (severity variants) | ✅ Built |
| EmptyState (icon + title + desc + CTA) | ✅ Built |
| LoadingState | ⏳ Not built |
| ErrorState | ⏳ Not built |
| StatusBadge | ⏳ Not built (may be redundant with Badge) |

## Providers

| Provider      | Status |
|---------------|--------|
| ThemeProvider | ✅ Wired in root layout |
| QueryProvider | ✅ Wired in root layout |
| AuthProvider  | ⏳ Not built |
| SocketProvider| ⏳ Not built |

## UI Kit (shadcn/ui)

| Component | Status |
|-----------|--------|
| Button     | ✅ Built |
| Card (CardHeader/CardContent/CardTitle/CardDescription) | ✅ Built |
| Badge      | ✅ Built |
| Input      | ✅ Used in forms (login) |
| Select     | ⏳ Not built |
| Table      | ⏳ Not built (devices use hand-crafted HTML) |
| Dialog     | ⏳ Not built |
| Dropdown   | ⏳ Not built |
| Tabs       | ⏳ Not built |
| Sheet      | ⏳ Not built |
| Tooltip    | ⏳ Not built |
| Avatar     | ⏳ Not built |
| Skeleton   | ⏳ Not built |
| Switch     | ⏳ Not built |
| Separator  | ⏳ Not built |
| Progress   | ⏳ Not built |

---

# Technical Debt

Priority order — tackle high items before medium, medium before low.

### High (blocks feature completion)

* ⏳ **Socket.IO integration** — Wire the real-time event provider. `notification-store` has `addNotification()` ready to consume. Without this, live device telemetry and alert streaming cannot work.
* ⏳ **MQTT subscription layer** — No ingestion pipeline at all. Device status, telemetry, and telemetry gauges (battery, voltage, temperature, signal) depend on this.
* ⏳ **Real authentication** — Login is mock-only (no API validation). Token refresh, intercept, and session expiry not implemented.
* ⏳ **RBAC backend validation** — `hasRole()`/`hasPermission()` exist but admin always returns `true`. Nav items not filtered by role. Routes not gate-protected.

### Medium (planned for Phase 3)

* ⏳ **Recharts dashboard** — Dashboard uses hand-crafted inline SVG gauges. Recharts listed in the build plan but never installed.
* ⏳ **TanStack Table** — Device table is hand-crafted HTML. Need virtual scrolling, column reorder, sorting, filtering, export.
* ⏳ **CSV export** — Events/reports pages have export buttons with no backend integration.
* ⏳ **PDF export** — Reports list PDF generation but no implementation.
* ⏳ **Device diagnostics** — Ping, connection test, MQTT status, error code lookup are UI mockups only.
* ⏳ **Mock data layer (`@sentience/mock`)** — Package is scaffolded with `package.json` but has zero Faker generators. Needed before TanStack Query hooks can consume real data.

### Low (polish / quality)

* ⏳ **Accessibility audit** — ARIA labels, keyboard navigation, focus management, reduced motion not reviewed.
* ⏳ **Mobile polish** — Sidebar collapses to drawer. Full responsive pass (bottom tab bar, card-list tables) not done.
* ⏳ **Animations** — `animate-fade-in`, `animate-pulse-dot`, `animate-slide-in-right` exist in CSS but not systematically applied.
* ⏳ **Performance optimization** — No profiling done. Bundle size per route not audited.

---

# Build Metrics

```
TypeScript    ✅ Clean (pnpm lint passes)
ESLint        ✅ Clean
Build         ✅ Success (pnpm build passes)
Static Routes  15
Dynamic Routes  Stubbed (devices/[id], sites/[id])
Shared JS     ~102 kB
First-load JS  ~102–115 kB per page
Hydration Err  0
Bundle Errors  0
```

---

# Next Milestones

## Milestone 2 — Data Layer

* Implement `@sentience/mock` — Faker generators for 3 customers, 5 estates, 15 sites, 200+ devices, 500+ events, alert engine
* Create TanStack Query hooks: `useDevices`, `useDevice`, `useSites`, `useEstates`, `useAlerts`, `useEvents`, `useNotifications`
* Build repository layer in `apps/web/src/lib/` (API client, query key factory, error handling)
* Replace inline mock data on all 15 pages with hook-driven data
* Add `LoadingState` and `ErrorState` components for loading/error UX
* Add `AuthProvider` context wrapper
* Wire `devices/[id]` and `sites/[id]` dynamic routes with real data resolution
* Add error boundaries per route group

## Milestone 3 — Realtime

* Build `SocketProvider` with auto-reconnect and room-based subscriptions
* Create MQTT Gateway integration layer
* Wire device telemetry subscriptions (battery, voltage, temperature, signal)
* Connect live status updates to `notification-store`
* Implement alert streaming via socket feed
* Update dashboard KPIs in real time

## Milestone 4 — Feature Completion

* Integrate Recharts for dashboard charts (system health donut, status pie, event timeline)
* Replace hand-crafted device table with TanStack Table (virtual scrolling, column visibility, sort)
* Implement CSV and PDF export for reports and events
* Build device diagnostics: ping, connection test, MQTT status, error code lookup
* Complete remaining shadcn/ui components: Dialog, Tabs, Sheet, Select, Table, Dropdown, Tooltip, Avatar, Skeleton, Switch, Separator, Progress
* Wire RBAC: filter nav items by role, gate routes and actions

## Milestone 5 — Polish & Admin

* Role-based navigation (4 personas: admin, support, installer, customer)
* Responsive pass: bottom tab bar on mobile, card-list tables, single-column dashboard
* Accessibility pass: ARIA labels, keyboard nav, focus management, reduced motion
* Settings: tenant config, profile, API keys, feature flags
* Audit log with real event capture
* User invitation flow with email/backend
* E2E tests with Playwright or Cypress

---

# Architectural Constraints — Rules for Future AI Instances

These are **binding constraints**. Any AI working on this codebase MUST follow them.

## State Management (Never Mix Concerns)

| Concern | Tool | Do Not Use |
|---------|------|-----------|
| Server/API state | TanStack Query | Zustand for API data, Redux, MobX, Context state duplication |
| Client/UI state | Zustand | Redux, MobX, Context for UI state |
| Real-time events | Socket.IO → Zustand stores | Polling, WebSocket directly in components |

## Package Boundaries

- `@sentience/types` — zero runtime dependencies. Types only (no classes, no logic).
- `@sentience/utils` — pure functions only. No React, no hooks.
- `@sentience/ui` — reserved for shared UI components (shadcn/ui patterns).
- `@sentience/hooks` — shared React hooks.
- `@sentience/mock` — Faker-based generators. Never imported in production bundles.
- `@sentience/config` — Tailwind preset, TypeScript config. Build-time only.

## Component Patterns

- Every page MUST be `"use client"` → `PageHeader` → content. Do not break this pattern.
- Reuse existing shared components (`StatusDot`, `EmptyState`, `Badge`, `PageHeader`) before creating new ones.
- New reusable components go in `apps/web/src/components/shared/`.
- Feature-specific components go in `apps/web/src/components/{feature}/`.

## CSS & Theming

- Tailwind utility classes only — no CSS modules, no styled-components, no CSS-in-JS.
- Use CSS variable tokens (`border`, `card`, `muted`, `background`) from `globals.css` for theme-aware styling.
- Status colors use literal Tailwind values (`emerald`/`slate`/`red`/`amber`) — NOT CSS variables — so they stay consistent across light/dark themes.
- Custom animations are defined in `globals.css` `@layer utilities` — use these classes rather than writing inline animations.
- New pages MUST be responsive and compatible with both light and dark themes.

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Files | kebab-case | `auth-store.ts`, `page-header.tsx` |
| Components | PascalCase | `DashboardShell`, `StatusBadge` |
| Stores | camelCase + "Store" suffix | `useAuthStore`, `useUIStore` |
| Hooks | camelCase + "use" prefix | `useDevices`, `useAlerts` |
| Types (interfaces) | PascalCase | `Device`, `SiteEstate` |
| Types (unions) | camelCase | `DeviceStatus`, `EventSeverity` |

## Quality Gates

- The project MUST remain **TypeScript-clean** (`pnpm lint` passes) after every milestone.
- The project MUST remain **build-clean** (`pnpm build` passes) after every milestone.
- Do not introduce new warnings or errors.
- If a change breaks the build or lint, fix it before moving to the next task.
- Do not remove or modify existing component interfaces without updating all consumers.

## What Not To Do

- Do **not** replace the established architecture without strong justification documented in this plan.
- Do **not** introduce Redux, MobX, Context state duplication, or alternative state libraries.
- Do **not** break monorepo package boundaries (e.g., importing `@sentience/mock` in production code).
- Do **not** add runtime dependencies to `@sentience/types`.
- Do **not** add React dependencies to `@sentience/utils`.
- Do **not** create new page layouts that bypass `DashboardShell`.
- Do **not** use inline styles or CSS modules — Tailwind only.
- Do **not** import from barrel files (index.ts) in a way that creates circular dependencies.

---

# Dependency Graph

Do not start a feature until all of its dependencies are complete. Blocks (⬡) must be finished before the dependent feature begins.

```
                    ⬡ Foundation (monorepo, types, utils, config)
                      │
                      ▼
                    ⬡ Design System + Theme (shadcn/ui, CSS vars, dark mode)
                      │
                      ▼
                    ⬡ Layout Shell (DashboardShell, Sidebar, Header, Providers)
                      │
              ┌───────┴───────┐
              ▼               ▼
        ⬡ Authentication   ⬡ Mock Data Layer
              │               │
              ▼               ▼
        ⬡ Zustand Stores   ⬡ TanStack Query Hooks
              │               │
              └───────┬───────┘
                      ▼
              ⬡ API Client + Repository Layer
                      │
                      ▼
              ⬡ Socket Provider (real-time)
                      │
              ┌───────┼───────────┬──────────────────┐
              ▼       ▼           ▼                  ▼
        ⬡ Device  ⬡ Estate   ⬡ Site            ⬡ Alerts
          Service  Service    Service             Service
              │       │           │                  │
              └───────┼───────────┼──────────────────┘
                      │           │
                      ▼           ▼
              ⬡ Dashboard    ⬡ Events / Timeline
                      │           │
              ┌───────┴───────┬───┘
              ▼               ▼
        ⬡ Reports        ⬡ Notifications
              │               │
              ▼               ▼
        ⬡ Diagnostics    ⬡ User Mgmt + RBAC
                              │
                              ▼
                        ⬡ Admin / Settings
                              │
                              ▼
                        ⬡ Audit Log
```

## Blocking Rules (Do Not Start X Until Y Is Complete)

| Feature | Blocked By |
|---------|-----------|
| Dashboard | Device Service, Estate Service, Site Service |
| Device Detail page | Device Service, Socket Provider |
| Telemetry gauges | Socket Provider, MQTT layer |
| Alerts system | Alerts Service, Socket Provider |
| Alert streaming | Socket Provider |
| Event History | Events Service, Alerts Service |
| Reports | Event History, TanStack Query Hooks |
| Diagnostics | Device Detail (Device Service) |
| Notifications | Socket Provider, Notification Store wiring |
| User management | Authentication, RBAC store |
| Role/permission matrix | RBAC store |
| Admin settings | User management, Audit Log |
| Audit Log | Events Service, Authentication |
| Export (CSV/PDF) | Reports, Event History |
| RBAC route gating | Authentication, all feature modules |
| Responsive polish | All feature modules |
| E2E tests | All feature modules |

---

# Definition of Done

Every feature, component, or page MUST satisfy this checklist before being marked complete. No exceptions.

## Core Quality Gates

```
□ TypeScript compiles cleanly (pnpm lint)
□ ESLint passes with zero warnings
□ Production build succeeds (pnpm build)
□ All existing tests still pass
```

## UX Completeness

```
□ Page renders in both light and dark themes
□ Responsive at desktop (1280px+), tablet (768px), and mobile (375px)
□ Loading state displayed while data fetches
□ Empty state shown when no data exists
□ Error state shown with retry action on failure
□ Skeleton placeholders for initial page load
□ All interactive elements are reachable by keyboard
□ Focus indicators visible on all interactive elements
```

## Feature Completeness

```
□ Page follows the established "PageHeader + content" pattern
□ Uses TanStack Query for server/API data (not inline mocks)
□ Uses Zustand for UI/client state (not API data in stores)
□ Supports real-time updates if applicable (Socket Provider)
□ All CRUD operations handled (create, read, update, delete)
□ Optimistic updates for toggle/status changes where appropriate
□ Permission-checked actions gated by RBAC (hasPermission / hasRole)
```

## Accessibility

```
□ ARIA labels on all icon-only buttons and controls
□ Screen reader-friendly heading hierarchy (h1 → h2 → h3)
□ Color is not the sole differentiator (patterns + labels also used)
□ Reduced motion respected (prefers-reduced-motion media query)
□ Error messages associated with form inputs via aria-describedby
```

## Code Quality

```
□ No dead code, console.logs, or commented-out blocks
□ No magic numbers or inline strings (use constants from @sentience/utils)
□ No barrel imports that create circular dependencies
□ Component interfaces exported and reusable where applicable
□ New types added to @sentience/types (not inlined in components)
```

## Testing (when test infrastructure exists)

```
□ Unit tests cover data fetching hooks and utility functions
□ Component tests cover loading, empty, error, and success states
□ E2E tests cover critical user flows (login → dashboard → detail)
```

---

# Feature Completion Matrix

One-glance view of project progress. Updated as each milestone completes.

| Module | UI | Data/API | Realtime | Testing | Status | Est. Remaining |
|--------|:--:|:--------:|:--------:|:-------:|:------:|:--------------:|
| Auth (login, forgot-password, MFA) | ✅ | ⏳ | — | ⏳ | **65%** | Backend API integration |
| Dashboard (KPIs, gauges, alerts panel) | ✅ | ⏳ | ⏳ | ⏳ | **35%** | TanStack Query hooks, Recharts, socket feed |
| Estates (list, detail, create/edit) | ⏳ | ⏳ | — | ⏳ | **20%** | UI detail tabs, CRUD, mock data |
| Sites (list, detail, device summary) | ⏳ | ⏳ | — | ⏳ | **20%** | Detail page, site map, mock data |
| Devices (list, detail, telemetry) | ✅ | ⏳ | ⏳ | ⏳ | **30%** | Detail tabs, TanStack Table, socket telemetry |
| Alerts (list, streaming, rules) | ⏳ | ⏳ | ⏳ | ⏳ | **15%** | Real-time feed, acknowledge/resolve, rules config |
| Events (timeline, filters, export) | ✅ | ⏳ | — | ⏳ | **35%** | Cursor pagination, CSV export |
| Reports (builder, preview, export) | ✅ | ⏳ | — | ⏳ | **25%** | PDF/CSV generation, scheduled reports |
| Diagnostics (ping, MQTT, signal checks) | ✅ | ⏳ | ⏳ | ⏳ | **25%** | Real execution, report generation |
| Users (list, create, invite) | ✅ | ⏳ | — | ⏳ | **40%** | Invitation flow, email integration |
| Roles (matrix, permissions) | ✅ | ⏳ | — | ⏳ | **35%** | Backend persistence, permission enforcement |
| Notifications (dropdown, list, filters) | ✅ | ⏳ | ⏳ | ⏳ | **30%** | Socket feed, mark-all-read |
| Audit Log (viewer, filters) | ✅ | ⏳ | — | ⏳ | **25%** | Real event capture |
| Settings (tenant, profile, API keys) | ✅ | ⏳ | — | ⏳ | **35%** | Backend persistence, feature flags |
| Profile (avatar, password, MFA, prefs) | ✅ | ⏳ | — | ⏳ | **35%** | Backend persistence, MFA setup |

## Status Guide

| Emoji | Meaning |
|-------|---------|
| ✅ | Built and working (may use mock data) |
| ⏳ | Not started or in progress |
| — | Not applicable |

## Module State Definitions

- **UI**: Page exists with all primary components rendered, responsive, dark mode compatible.
- **Data/API**: Connected to real data via TanStack Query hooks (not inline mocks).
- **Realtime**: Live updates via Socket Provider (not manual refresh).
- **Testing**: Unit tests, component tests, and/or E2E tests exist.
- **%**: Heuristic estimate based on {UI: 25%, Data/API: 35%, Realtime: 20%, Testing: 20%} weights.
