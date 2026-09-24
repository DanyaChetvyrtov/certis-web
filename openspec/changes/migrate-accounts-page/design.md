# Design

## Context

See [proposal.md](proposal.md) for the motivation. `AppRouter` lazily loads `features/accounts/pages/AccountsPage.tsx` for `/accounts`. That component owns initial loading and retry through separate `getAccounts` paths, account filtering and sorting, per-currency balance and type composition, notice timing, modal state, focus coordination, and the full route markup. Its five route tests cover currency separation and create/edit/close flows; the legacy form, close dialog, and action menu also have focused interaction tests.

`AccountsPage.css` contains route layout, summary/list/row rules, responsive rules, and action-menu rules. `AccountModals.css` is already imported by the two modal components. Account-specific dark overrides are interleaved with other screens' selectors in `features/settings/DarkTheme.css`, which `ThemeProvider` imports globally. Existing account data and action modules are consumed by other legacy screens and by the migrated Transactions page. This change must preserve the `/api/v1/accounts` contract, the route URL, the current strings and focus behavior, and the Transactions account-filter contract.

## Goals / Non-Goals

**Goals:**

- Make `pages/accounts` the owner of the route, its state coordination, derived screen data, and page-only UI, with a small public API and no page-to-page imports.
- Keep account summary and list calculations independently testable while preserving their existing filtering, ordering, and currency semantics.
- Put Accounts-owned light, dark, and responsive CSS with the UI it styles; keep shared theme primitives and other screens' declarations effective.
- Enforce FSD boundaries for the new page through a narrow, documented legacy allowlist.

**Non-Goals:**

- Extracting `entities/account`, moving account request functions or account action workflows, or creating a generic account state/cache layer.
- Changing account sorting semantics, filter persistence, request/response formats, modal interactions, localization keys, or the overall visual design.
- Moving unrelated Dashboard, Categories, Budgets, profile, or global theme rules.

## Decisions

### 1. Move only the route into `pages/accounts`

Expose `AccountsPage` through `src/pages/accounts/index.ts` and update the lazy import in `AppRouter`. Keep the existing `WorkspaceSidebar` public API and `/accounts` path. Organize the slice with `ui` for the page and focused summary/list components and `model` for data coordination and pure selectors. Extract UI at meaningful boundaries: the balance summary, list controls and states, and account rows. Keep small page-local markup with its owner rather than creating a component for every element.

The page retains the existing `features/accounts/api/accountsApi` and `AccountFormModal`, `CloseAccountDialog`, and `AccountActionMenu` integrations. The account API/types are used by Dashboard, Goals, Transactions, and other workflows; moving them in this change would enlarge the migration and is reserved for `entities/account`. Alternative considered: relocate the whole legacy accounts folder or create a re-exporting entity now. Either would leave the page's mixed responsibilities in place and obscure the real ownership boundary.

### 2. Isolate fetching and pure derived data without changing UI state semantics

Consolidate the duplicate initial/retry `getAccounts` handling in a focused page-local data coordinator that owns loading, ready/error states and reload after close. Preserve the initial loading display, retry behavior, post-close refresh, and account update after a successful save. Keep modal open/close and focus restoration coordination close to the page rather than adding a global modal controller. Avoid a single hook that simply receives all existing page state and markup-related callbacks.

Move list filtering/sorting and summary calculations into pure `model` functions. Preserve active versus closed classification, case-insensitive search over account name, translated type label and currency, locale-aware name ordering, the existing balance/newest sort behavior, and the currency-scoped total. Preserve the current absolute-balance composition percentages by type; do not sum different currencies or reinterpret negative balances. Pass the translation/locale inputs the calculations currently use rather than introducing a global formatter. Focused tests should cover these decisions and existing empty/error states.

Alternative considered: extract a reusable `entities/account` selector set now. These calculations are tied to this screen's controls and display, so page ownership is clearer until another consumer needs the same behavior.

### 3. Relocate CSS by actual UI owner and preserve the cascade

Move page layout, summary/list/row, and responsive rules to `pages/accounts/ui` beside their components. Move action-menu rules currently embedded in `AccountsPage.css` into CSS imported by the existing `AccountActionMenu`; keep its keyboard-focus styles with it. Keep modal light rules with `AccountModals.css` and move account-modal dark overrides there. Split account-only dark selectors out of mixed `DarkTheme.css` groups into the page or legacy component stylesheets according to owner, leaving all non-Accounts selectors and genuinely global theme rules in place.

Preserve current class names, `html[data-theme='dark']` behavior, selector specificity, breakpoint values, reduced-motion rules, and safe-area behavior. Because the global sheet loads through `ThemeProvider` and the route is lazy-loaded, inspect the resulting import/cascade order and compare desktop/mobile light/dark rendering, including menus and dialogs, before deleting old selectors. Alternative considered: replace the mixed sheet with a new token system or CSS Modules; that would make a structural migration into a visual redesign.

### 4. Make temporary imports explicit and test the behavior boundary

Add `pages/accounts` to the migrated-slice checker. Permit only its exact imports of the legacy account API, the three account action components, `components/Select`, `components/Icons`, and `i18n/useLanguage`; give each exception an owner and removal point in `scripts/fsd-legacy-imports.mjs` and `docs/architecture.md`. Import `widgets/workspace-shell` through its public API and shared modules under the existing layer rule. Update the project architecture context to reflect the migrated Accounts route and remove stale references to `src/layouts` if they remain. Extend checker tests to reject unlisted legacy, upward, peer, and deep imports from this page.

Move/adapt the route test to the new slice and retain the existing action-component tests. Add focused tests for extracted selectors and route states where current coverage is thin: loading/retry, search/filter/sort, empty results, and summary currency changes. Verify creation, editing, closing, notices, and focus behavior with the current API mocks. No new copy is planned, so locale files change only if a genuinely new user-facing string becomes necessary.

Alternative considered: exempt the page from the checker until `entities/account` exists. The exact allowlist already supports incremental migration and prevents new undocumented coupling.

## Risks / Trade-offs

- Mixed dark selectors and lazy route CSS alter cascade order or another screen's appearance → split rules by owner without changing declaration values, retain shared selectors, and inspect light/dark desktop/mobile screens and account dialogs before removing originals.
- Moving state coordination changes request timing or leaves stale responses active → preserve the visible loading/retry/close sequence and cover rapid reload/unmount behavior in focused tests where necessary.
- Extracted selectors change currency totals, type percentages, or locale-aware search/sort → encode the current calculations in pure-function tests and keep route-level multi-currency assertions.
- The new page has temporary imports from legacy modules → list exact targets with removal points and let the checker reject additional exceptions; retire them in later account entity/workflow changes.
- Moving action-menu CSS affects legacy component tests and other consumers → have the component import its own stylesheet once and verify its focus/menu rendering in the Accounts route.

## Migration Plan

1. Add the `pages/accounts` slice and move the route composition behind `index.ts`, updating `AppRouter` while retaining `/accounts` and lazy loading.
2. Extract page-local data coordination and pure calculations, then split summary/list/row UI at stable props boundaries. Adapt route tests and add focused calculation/state coverage.
3. Move Accounts page and component-owned CSS and separate Accounts-only dark overrides from mixed global rules. Check responsive layout, themes, localization, dialogs, menus, and focus before removing old selectors and the obsolete legacy page.
4. Register the slice with the boundary checker, document exact transitional imports, update architecture context, and run focused tests followed by `npm run lint`, `npm test`, and `npm run build`.

Rollback is a source-level revert of the route import and moved modules/styles. The change has no persisted-data migration or backend deployment.
