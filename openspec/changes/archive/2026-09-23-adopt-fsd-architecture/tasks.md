# Tasks

## 1. Establish the FSD standard

- [x] 1.1 Add architecture guidance covering layer and slice ownership, public APIs, import direction, placement of new code, CSS ownership, and the legacy transition policy; verify the document includes concrete Certis examples and an explicit list of allowed legacy integrations.
- [x] 1.2 Implement a TypeScript-based import-boundary check for migrated slices and a narrow, documented legacy exception list; verify the check passes on the current permitted graph and exits nonzero for an unlisted violation.
- [x] 1.3 Add automated tests for valid downward imports, forbidden upward/peer/deep imports, dynamic imports, and legacy exceptions; verify the checker test suite passes.

## 2. Migrate Transactions page responsibilities

- [x] 2.1 Create `pages/transactions` with a public route entry and update `AppRouter` to lazy-load it; verify `/transactions` still renders under the protected route and its path is unchanged.
- [x] 2.2 Move page-specific filter parsing and URL coordination into the page model without changing query parameters, defaults, or custom-range commit behavior; verify the existing `transactionFilters` and Transactions URL-filter tests pass.
- [x] 2.3 Move remembered Transactions destination logic to a lower-layer, narrow transaction-navigation slice and update desktop/mobile navigation and sign-out callers; verify the existing destination and sidebar tests pass with the same per-profile storage key and explicit-link precedence.
- [x] 2.4 Extract pure selectors for transaction metrics, spending by category, visible activity, and date grouping while keeping transfer and currency rules intact; verify the current Transactions summary and activity integration tests pass.
- [x] 2.5 Extract the page's resource and transaction request lifecycle into page-local data coordination with explicit stale-response handling and retry behavior; verify Transactions loading, error, filter-change, and mutation flows pass their integration tests.
- [x] 2.6 Split the page UI into owned sections for metrics, activity, quick filters, and spending analysis, keeping existing form and recurring integrations; verify the Transactions route tests pass and the page no longer contains those sections' full rendering logic.

## 3. Migrate Transactions styling

- [x] 3.1 Move Transactions page layout and responsive rules next to the page UI owners, retaining current class names and breakpoints; verify history and recurring screens render correctly at desktop and mobile widths.
- [x] 3.2 Move Transactions-specific dark-theme rules from `DarkTheme.css` beside the owning page or components, leaving shared selectors needed by other screens intact; verify Transactions history, menus, forms, dialogs, and recurring view in both light and dark themes.
- [x] 3.3 Review styling changes for shared controls and other routes, and keep existing English/Russian UI text; if any user-facing text is introduced, update both locale files and verify both locales display it, otherwise verify no copy was added.

## 4. Automated and visual regression checks

- [x] 4.1 Add focused tests for extracted selectors, including transfer exclusion/deduplication, multiple currencies, account/category filtering, and empty results; verify those unit tests pass.
- [x] 4.2 Update route-level tests to cover direct filtered URLs, Back/Forward, menu return, reset, invalid parameters, rapid filter changes, retry, and representative create/edit/reverse flows after module moves; verify the Transactions, destination, and navigation suites pass.
- [x] 4.3 Review the final Transactions UI at desktop and mobile widths in light/dark themes and English/Russian, including history, recurring, and modal states; verify no visible layout, focus, or keyboard regression is found before removing old CSS selectors.

## 5. Finalize the pilot and verify

- [x] 5.1 Update `README.md` and `openspec/config.yaml` to describe FSD as the target for new code and mark unmigrated `src/features/*` as legacy; verify both documents agree with the implemented structure and the boundary-check scope.
- [x] 5.2 Remove obsolete files, imports, and pilot exceptions after the route and styles have moved; verify the import-boundary check passes and no route or stylesheet points at a removed path.
- [x] 5.3 Run `npm run lint`, `npm test`, and `npm run build`; verify all three complete successfully before marking the implementation ready.
