# Design

## Context

See `proposal.md` for motivation. The repository already has a feature-oriented structure, reusable controls in `src/components`, an API client and modal-accessibility hook in `src/shared`, route composition in `src/app/AppRouter.tsx`, and a few page-level hooks. The Transactions route is currently implemented inside `src/features/transactions/pages/TransactionsPage.tsx`; that file owns URL filter coordination, several requests, derived metrics, mutation handlers, and most of the screen markup. `src/features/transactions/transactionFilters.ts` already isolates URL parsing and serialization, and the current `transaction-filters` specification and tests define behavior to preserve. The route also uses `src/app/transactionsDestination.ts` to remember its URL for workspace navigation.

Transactions styles are spread across the page stylesheet, form/component stylesheets, and Transactions-specific selectors grouped with other screens in `src/features/settings/DarkTheme.css`. `ThemeProvider` currently sets `data-theme` on the document. Existing styles and the API contract must remain compatible throughout migration.

## Goals / Non-Goals

**Goals:**

- Establish a repeatable FSD placement and import policy for new code, while allowing a bounded legacy transition.
- Make the Transactions route a page slice with smaller modules separated by reason to change.
- Give Transactions UI and CSS clear owners without changing visible output or accessibility behavior.
- Make architecture checks part of the normal lint workflow for migrated code.

**Non-Goals:**

- Force every FSD layer or a public `index.ts` in folders with no cross-slice consumers.
- Move every current `src/features/*` area, all account/category APIs, the entire sidebar, or the whole global theme stylesheet in this pilot.
- Introduce a query/state library, CSS framework, or backend contract change.

## Decisions

### 1. FSD is the target architecture; legacy modules have explicit transition rules

Use the standard dependency direction `app -> pages -> widgets -> features -> entities -> shared`. A slice may import another slice only from a lower layer, through that slice's public API. `app` and `shared` follow their layer-specific composition rules. Create `widgets` and `entities` slices only when a real owner and consumers exist; avoid placeholder layers. Code internal to one page stays in its page slice even if it is a large block. The [FSD layer](https://feature-sliced.design/docs/reference/layers) and [slice/public API](https://feature-sliced.design/docs/reference/slices-segments) references define the vocabulary.

New standalone pages, user actions, and shared domain modules follow this standard immediately. Existing broad `src/features/*` folders remain legacy until migrated; changing an existing legacy flow for maintenance does not trigger a wholesale move. Record temporary imports from migrated code into legacy modules in a narrow allowlist with an owner and intended removal point. Do not make lower-layer code depend on `pages` or `app` just to bridge the migration. Update `README.md` and `openspec/config.yaml` to explain that legacy status, so the current feature-folder guidance does not contradict the adopted standard.

Alternative considered: move the whole repository into six folders first. That produces a large, hard-to-review diff and retains the mixed responsibilities inside the moved files.

### 2. The Transactions pilot owns its page-specific logic and presentation

Expose the route component from `src/pages/transactions/index.ts` and point `AppRouter` at that public API while keeping `/transactions` and its lazy loading. Organize the page slice by responsibility, for example `ui` for page composition and screen-only sections, `model` for the page's URL filter coordination and pure selectors, and local style files beside their UI owners. Move `transactionFilters.ts` into the page model if no other route uses it; keep the same URL parameter vocabulary and tests. Extract the transaction metrics, category spending calculation, activity filtering/grouping, and date labels into pure functions where they can be tested without rendering the whole page. A page-local data hook coordinates the existing account, category, transfer, and transaction requests, loading/error states, reloads, and stale-response handling. UI sections receive explicit data and action props. Avoid a single hook that merely moves the current 2,000-line component elsewhere.

Keep existing transaction, transfer, recurring, account, and category API clients and action forms working during the pilot. The old transaction feature modules are temporary lower-layer integrations; migrate them later only when their entity/action boundaries are clear. Move the last-Transactions-destination behavior from `src/app/transactionsDestination.ts` to a lower-layer transaction navigation feature or equivalent narrow slice, because the page and workspace navigation both consume it. Preserve its per-profile `sessionStorage` key, explicit-link precedence, and sign-out clearing behavior.

Alternative considered: immediately create `entities/transaction`, `entities/account`, and `entities/category` by re-exporting existing feature APIs. Re-export facades would preserve the current coupling while making the directory tree appear compliant; real entity extraction belongs in later focused changes.

### 3. CSS follows UI ownership, with stable global theme primitives

Keep the existing `ThemeProvider` and document-level theme selection unchanged during this pilot; genuinely global tokens remain global, with `app/styles` as their eventual FSD owner. Keep Transactions page layout and responsive rules with `pages/transactions/ui`; keep form, menu, and recurring-view rules with the owning components, including components that remain temporarily in the legacy transaction area. Split mixed selectors in `DarkTheme.css`: retain shared declarations needed by other screens and move Transactions-only dark overrides next to Transactions styles. Prefer existing CSS custom properties for repeated theme values; add a new token only when it serves more than one owner. Retain current class names and `html[data-theme='dark']` behavior during the pilot to minimize cascade and visual changes. Import styles once from the owner so route lazy loading and cascade order are verified.

Alternative considered: convert all styles to CSS Modules or rebuild the design system first. Both expand the diff without addressing the page's data and responsibility boundaries.

### 4. Enforce boundaries for migrated code without blocking legacy work

Add a small static import-boundary check to `npm run lint`, using the existing TypeScript tooling rather than a runtime dependency. The check resolves static and dynamic imports in migrated FSD slices, rejects upward and cross-slice same-layer imports, and requires cross-slice imports through public entry points. Document exact transitional source-target exceptions for imports into legacy folders; fail on unlisted new exceptions. Keep the check scoped so current legacy internals and unrelated screens can still be maintained while the allowlist shrinks. Tests for the check cover accepted lower-layer imports, forbidden peer/upward/deep imports, and listed legacy exceptions.

Alternative considered: documentation-only rules. They would be easy to bypass as the repo grows. A broad immediate rule over all current `src/features` would instead fail many existing imports and prevent incremental migration.

### 5. Preserve product and API behavior as the acceptance boundary

Continue using the current API request functions and response types; assume no `certis-api` endpoint, parameter, or response changes. Keep the `transaction-filters` spec authoritative for direct links, Back/Forward, menu return, reset, relative periods, and invalid parameters. Preserve transaction and transfer creation/edit/reversal flows, recurring management, summary and category-spending calculations, localized labels, supported currencies, keyboard/focus behavior, and responsive layouts. Add focused tests for extracted calculations and navigation only where existing integration coverage does not protect them; retain representative integration tests through the route.

Alternative considered: combine the refactor with product improvements such as new filters or a visual redesign. Separating those decisions keeps behavioral regressions distinguishable from intentional changes.

## Risks / Trade-offs

- **Transition rules linger** -> Keep an explicit exception list, reject new unlisted exceptions, and remove entries as later slices migrate.
- **CSS cascade or lazy-load order changes visual output** -> Move one owner at a time, inspect light/dark and desktop/mobile states, and compare key Transactions screens and dialogs before removing old selectors.
- **Extraction changes request timing or stale-response handling** -> Preserve existing query keys and cancellation/ignore semantics, and cover rapid filter changes and retries in tests.
- **Public APIs become oversized barrels** -> Export only what another slice uses; keep page-private helpers internal.
- **Wide import churn obscures behavior changes** -> Move the page in small commits, keep backend and URL contracts fixed, and run lint, tests, and build after each migration stage.

## Migration Plan

1. Document layer/slice ownership, CSS ownership, and legacy policy; introduce the import check with a narrow initial migrated scope.
2. Move Transactions route composition and its page-specific filter/selector logic into `pages/transactions`, keeping the route path and public behavior stable.
3. Split data coordination and UI sections; update the existing route and focused tests as modules move.
4. Relocate Transactions-owned styles and dark overrides, preserving other screens' selectors in the central stylesheet. Verify light/dark, English/Russian, multiple currencies, desktop/mobile, and dialogs.
5. Integrate the architecture check into lint; update README and OpenSpec project context; remove pilot exceptions that are no longer needed.
6. Run the full lint, test, and production build gates. Later migrations of other product areas are separate changes.

No persisted user data or API payload is migrated. If the pilot causes regressions, the route can be pointed back to the previous page module and the relevant stylesheet imports restored while retaining the documented standard for subsequent work.
