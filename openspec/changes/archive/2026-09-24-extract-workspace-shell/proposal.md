# Proposal

## Why

The workspace navigation appears on all six protected screens, but its desktop and mobile rendering, account menu, profile/settings dialogs, sign-out flow, and focus handling are coupled in the transitional `src/layouts/WorkspaceSidebar.tsx`. This makes a change to a shared user-facing control harder to review and increases the chance of inconsistent navigation or styling across screens. The completed Transactions pilot established FSD rules; moving this real multi-page block is the next focused test of the `widgets` layer.

## What Changes

- Move the existing workspace navigation into a `widgets/workspace-shell` slice with a narrow public API, and update Dashboard, Accounts, Transactions, Budgets, Goals, and Categories to consume it.
- Separate navigation presentation from account-menu, profile/settings, sign-out, and focus coordination within the widget. Preserve the existing desktop and mobile destinations, active states, menu behavior, account summary, and accessible interactions.
- Move the widget-owned desktop and mobile CSS next to its UI. Preserve current class names, responsive breakpoint, light/dark appearance, and layout while removing obsolete stylesheet imports and files.
- Extend the FSD boundary check to the new widget, record only the exact legacy integrations it still needs, and remove the Transactions-to-legacy-sidebar exception. Update architecture documentation to describe the new owner and remaining transition paths.
- Preserve the existing `transaction-filters` contract: both menus continue to use the current profile's remembered Transactions URL, and successful sign-out clears that destination.

Out of scope: visual redesign, changing navigation routes or menu copy, changing authentication/profile/settings behavior, migrating all six pages or their outer layout wrappers to FSD, migrating unrelated shared controls, backend or API contract changes, and adding a new state-management library.

## Capabilities

### New Capabilities

None. This change only reorganizes existing UI and logic.

### Modified Capabilities

None. The existing `transaction-filters` requirements and all other observable navigation behavior remain unchanged. This change declares `skip_specs: true`.

## Impact

- Frontend: `src/layouts/WorkspaceSidebar*`, `src/layouts/MobileWorkspaceNavigation*`, their six consumers, and the new `src/widgets/workspace-shell` slice.
- Existing integrations: `features/auth/session/SessionContext`, `features/transaction-navigation`, `features/profile`, `features/settings`, `components/Icons`, and `shared/api/ApiError`; no backend contract changes.
- Architecture/tooling/docs: `scripts/check-fsd-boundaries.mjs`, its tests, `scripts/fsd-legacy-imports.mjs`, and `docs/architecture.md`.
- Verification: preserve focused navigation tests, route-level behavior, keyboard/focus handling, English/Russian text, and desktop/mobile light/dark styling; run lint, tests, and production build.
