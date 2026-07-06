# Plan: Enhanced Diagnostics UX with Rich Progress Feedback

## Summary

Rewrite the diagnostics page execution UX to provide immediate, continuous, and meaningful feedback from click through completion — including per-card progress bars, step messages, completion animations, and auto-refresh of results.

## Files to Change (3 files)

### 1. `apps/web/src/app/globals.css` — Add progress bar animation

Add two new `@keyframes` in `@layer utilities`:
- `animate-progress-indeterminate` — for the indeterminate progress bar sweep
- `animate-highlight-fade` — for the new-result highlight that fades after 2s
- `animate-fade-in-up` — for completion messages sliding in

### 2. `apps/web/src/hooks/use-diagnostics.ts` — Add simulated delay

In simulator mode, the mutation resolves instantly (<1ms), so the user never sees the loading UI. Add a 2–4 second artificial delay inside `mutationFn` so the progress indicators have time to render.

### 3. `apps/web/src/app/(dashboard)/diagnostics/page.tsx` — All UX changes

#### New state variables
```ts
lastCompletedRun: { testId: string; status: string; message: string; durationMs: number } | null
runningStep: number  // cycles 0-2 for step messages
```
`lastCompletedRun` is set on mutation success/error, auto-cleared after 3s via `useEffect` cleanup timer.

#### Enhanced `TestCard` component

| State | Visual |
|-------|--------|
| **Idle** | Current: icon + name/desc + ▶ Run Diagnostic |
| **Running** | Progress bar (animated indeterminate sweep) + step message cycling every ~1.5s  + ⏳ Running... button (disabled) |
| **Completed (success)** | ✓ icon overlay + green status + `Completed in 2.3s` text + ✓ Completed button (non-interactive, 3s auto-reset) |
| **Completed (failed)** | ✗ icon overlay + red status + error snippet + ⚠ Failed button (non-interactive, 3s auto-reset) |

Step messages cycle via `useEffect` interval while `running`:
```
Phase 0 (0s):   "Connecting to device..."
Phase 1 (1.5s): "Running test..."
Phase 2 (3s):   "Analyzing results..."
```

After completion, card shows summary state for 3 seconds, then auto-resets to idle. Pass `lastCompletedRun` and `deviceName` as props.

#### Progress banner (above Recent Diagnostics)
When `runningTestId` is set, show an info banner:
```
Running "Ping Test" on "Warehouse 1 East Lighting Relay"...
This may take a few seconds.
```
Full-width styled div with blue left border, spinner icon, auto-hidden when nothing is running.

#### Recent Diagnostics auto-scroll + highlight
- `useRef` on the Recent Diagnostics `Card`
- After a successful run, `scrollIntoView({ behavior: 'smooth', block: 'nearest' })`
- Newest result row gets a highlight CSS animation (background color fade) for 2s

#### Better device name display
Look up device name from `devices` array using `selectedDeviceId` for the progress banner.

#### Enhanced `ResultRow`
Add optional `isHighlighted` prop — applies `animate-highlight-fade` class.

## What stays the same

- All existing API/simulator mutation logic (just adding artificial delay in sim mode)
- All existing states already handled: loading skeleton, error card with retry, empty state, pagination
- Button already has `disabled={isRunning}` — double-click prevention is built in
- The mutation hook's `onSuccess` already invalidates queries in API mode
- No new packages, no new infrastructure, no architectural changes

## What doesn't change

- No new files created
- No changes to stores, types, API layer, or query keys
- No changes to state management architecture
- No changes to package boundaries
