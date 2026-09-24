# Tasks

## 1. Migrate the Accounts route and responsibilities

- [x] 1.1 Create `src/pages/accounts` with a public `index.ts`, move the `/accounts` route component into the slice, and switch `AppRouter` to its public API; verify `/accounts` remains lazy-loaded and `npx tsc -b` resolves the new route.
- [x] 1.2 Consolidate initial load, retry, save-result update, and post-close reload in a focused page-local data coordinator while preserving loading/error/notice and focus behavior; verify the existing Accounts route tests still pass.
- [x] 1.3 Extract pure account-list and summary calculations into the page model, preserving translated search, locale/name and balance/newest sorting, active/closed counts, currency-scoped totals, and absolute-balance type percentages; verify the route's multi-currency and account-list assertions still pass.
- [x] 1.4 Split the balance summary, list controls/states, and account rows into focused page UI components with explicit props, keeping modal coordination in the page; verify the existing create/edit/close route tests and action-component tests pass.

## 2. Move CSS and enforce FSD boundaries

- [x] 2.1 Move Accounts layout, summary/list/row, responsive, and reduced-motion styles beside their page UI owners, and move action-menu styles from the page sheet beside `AccountActionMenu`; verify no obsolete `AccountsPage.css` import remains and the original page/menu selectors and breakpoints are accounted for.
- [x] 2.2 Move Accounts-only dark page/menu/modal overrides from mixed `DarkTheme.css` rules into their owning stylesheets, preserving values, specificity, and non-Accounts declarations; verify no duplicate Accounts-only override remains in the global sheet and inspect computed styles in both themes.
- [x] 2.3 Add `pages/accounts` to the FSD checker with only the exact legacy account API, action components, `Select`, `Icons`, and localization imports; update `scripts/fsd-legacy-imports.mjs`, `docs/architecture.md`, and stale `openspec/config.yaml` architecture context, then verify `npm run lint:architecture` passes and documented exceptions match the checker list.
- [x] 2.4 Remove the obsolete legacy Accounts page and stylesheet after consumers and tests switch; verify `rg` finds no imports of the removed page/styles and `/accounts` still renders from `pages/accounts`.

## 3. Automated regression coverage

- [x] 3.1 Add focused page-model tests for search by name/translated type/currency, status filters, locale-aware and balance/newest ordering, mixed-currency totals, negative-balance composition, and empty results; verify the focused model test suite passes.
- [x] 3.2 Move/adapt the existing Accounts route tests and cover loading/retry, search/filter/sort, summary currency changes, create/edit/close notices, and focus restoration; verify the focused Accounts page and legacy form/menu/dialog suites pass with the unchanged API contract.
- [x] 3.3 Extend architecture-checker tests for the migrated Accounts slice, including accepted public APIs and rejected upward, peer, deep, and unlisted legacy imports; verify the checker test suite passes.

## 4. Visual and final verification

- [x] 4.1 Review `/accounts` on desktop and mobile in light/dark themes and English/Russian, including summary, list, empty/error/loading states, action menu, create/edit/close dialogs, and focus; verify no visible regression or new copy, and update locale files only if a new user-facing string is actually introduced.
- [x] 4.2 Run `npm run lint`, `npm test`, and `npm run build`; verify all succeed, the architecture checker passes, and no removed page/style import or unintended account-specific rule remains in `DarkTheme.css` before marking the change complete.
