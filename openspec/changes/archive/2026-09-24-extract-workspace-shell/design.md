# Design

## Context

See [proposal.md](proposal.md) for the motivation. `src/layouts/WorkspaceSidebar.tsx` currently renders the desktop sidebar, coordinates the mobile navigation, reads the session, derives profile display data, opens profile/settings modals, handles the shared account menu, and performs sign-out. `MobileWorkspaceNavigation.tsx` renders four primary mobile links plus a More menu for Goals, Categories, and account actions. The six protected screens import `WorkspaceSidebar` directly; Transactions is already an FSD page, while the other consumers remain transitional.

The existing `transaction-filters` spec requires desktop and mobile menu links to use the current profile's last Transactions URL. CSS is imported by both layout components; the desktop and mobile rules live in separate files and the current mobile breakpoint is 900px. The sidebar itself uses a dark surface in both application themes; there is no workspace-sidebar rule in the central `DarkTheme.css` to relocate.

## Goals / Non-Goals

**Goals:**

- Give the multi-page navigation block one FSD owner and one public entry point.
- Keep session/menu/sign-out coordination separate from desktop and mobile rendering, while sharing route metadata and derived account data where that removes real duplication.
- Preserve existing DOM semantics, destinations, active states, CSS behavior, focus restoration, localization, and API usage.
- Make the new widget subject to the same automated import-boundary enforcement as Transactions.

**Non-Goals:**

- Moving the six route components, their outer layout containers, or generic controls into new layers.
- Redesigning navigation or changing the sign-out, profile, settings, or Transactions persistence contracts.
- Creating a global menu framework, a new auth abstraction, or a backend API.

## Decisions

### 1. Own the block in `widgets/workspace-shell`

Add `src/widgets/workspace-shell/index.ts` as the only cross-slice entry point, exporting `WorkspaceSidebar` with its current `activePage` and optional `activeAccounts` props. Within the slice, place desktop and mobile presentation in `ui`, and put menu/session orchestration in a focused local hook or controller under `model`. Keep small UI components local to the widget. Use one local navigation descriptor for route, translation key, and icon where desktop and mobile share them; preserve the mobile split between four primary links and the More menu.

This is a widget because it is a complete reusable block composed of navigation and account actions across six screens. A page-local component would duplicate its owner, and `shared/ui` would incorrectly hold Certis-specific routes and session behavior. Keep the exported name to minimize consumer and test churn; do not export internal mobile/menu parts unless a real external consumer appears.

### 2. Reuse existing workflows and preserve their order

Continue using `useSession` from the legacy auth session context, `getTransactionsDestination` and `clearTransactionsDestination` from the migrated `features/transaction-navigation` public API, `ProfileModal`, `createProfilePhotoSrc`, `SettingsModal`, `ApiError`, `Icon`, and `CertisLogo`. The widget obtains the remembered Transactions destination with the current `profile?.id` and passes the same destination to desktop and mobile links. On successful `signOut`, clear that profile's destination and navigate to `/` with replacement; on failure, keep the destination and show the current error. Keep the single open-menu state, outside-pointer and Escape handling, and separate desktop/mobile trigger refs used to restore focus from dialogs.

The alternative of moving auth/profile/settings or Transactions destination behavior into the widget would blur the feature boundary and expand this change. No API response or request shape changes are assumed. The existing session methods and profile fields, modal props, and transaction-navigation API remain the integration contracts.

### 3. Move CSS with the widget owner

Move `WorkspaceSidebar.css` and `MobileWorkspaceNavigation.css` into the widget `ui` directory and import them from their owning components. Preserve class names, selector specificity/order, the 900px breakpoint, safe-area padding, and existing surfaces. Remove only obsolete layout files/imports after all consumers have switched. Check both themes and both locales on desktop and mobile because relocating CSS can change cascade order even when declarations are identical. Do not move unrelated profile/settings or global theme rules.

### 4. Make the migration boundary explicit

Add `widgets/workspace-shell` to the migrated-slice set in `scripts/check-fsd-boundaries.mjs`. Its permitted imports into legacy modules are exact entries in `scripts/fsd-legacy-imports.mjs`: `components/Icons`, `features/auth/session/SessionContext`, `features/profile/ProfileModal`, `features/profile/profilePhoto`, and `features/settings/SettingsModal`, each with an owner and removal point. It imports `features/transaction-navigation` via `index.ts` and `shared/api/ApiError` directly under the existing shared rule. Remove the old `pages/transactions` exception for `layouts/WorkspaceSidebar` once Transactions imports the widget public API.

The four legacy route modules under `features/*` and the transitional `pages/DashboardPage.tsx` will temporarily import this widget outside the migrated checker scope. Document that consumer relationship to remove when each route becomes an FSD page slice. Migrating those pages now would turn a focused shared-block change into a multi-route rewrite.

## Risks / Trade-offs

- **CSS cascade or responsive changes after moving imports** → preserve source order and selectors, then compare desktop/mobile in light/dark themes, including the More menu and dialogs.
- **Menu focus or keyboard regression while splitting logic** → keep trigger refs and current open/close sequence; add interaction tests for Escape, outside click, dialog close focus, and sign-out failure/success.
- **A remembered Transactions URL leaking across profiles** → retain the existing per-profile feature API and cover both menu links, profile switching, and successful sign-out in integration tests.
- **Temporary upward imports from legacy pages** → document their transitional status and avoid expanding the checker exception list to arbitrary modules; migrate those pages separately.

## Migration Plan

1. Add the widget and move the existing behavior/UI and CSS within it, keeping the public component contract stable.
2. Update all six consumers and affected test imports/mocks to use `widgets/workspace-shell`; remove the obsolete `src/layouts` implementations and styles after references are gone.
3. Extend boundary enforcement and documentation, removing the old sidebar exception and adding the widget's exact legacy dependencies.
4. Run focused navigation and route tests, inspect representative desktop/mobile light/dark and English/Russian states, then run lint, the full test suite, and a production build.

Rollback is a source-level revert; this change does not migrate persisted data or alter server contracts.
