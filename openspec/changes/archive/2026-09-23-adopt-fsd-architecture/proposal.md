# Proposal

## Why

Certis Web already groups code by product area, but several screens combine data loading, derived business data, actions, and large UI trees in one file. This makes otherwise local changes to the Transactions experience harder to review and safer reuse harder to identify. Adopt Feature-Sliced Design (FSD) as the standard for new code and test it through a focused Transactions migration before extending it to the rest of the application.

## What Changes

- Define the responsibilities of `app`, `pages`, `widgets`, `features`, `entities`, and `shared`; public APIs; dependency direction; and ownership of state, API access, UI, and CSS. Create only layers and slices needed by actual code.
- Apply that standard to new product code immediately. Treat existing broad `src/features/*` modules as legacy during an incremental migration, with explicit, shrinking exceptions to the new import rules.
- Use Transactions as the first migration slice. Move route-level composition to `pages/transactions`, separate its data lifecycle, calculations, and UI sections by responsibility, and preserve the existing transaction, transfer, recurring, account, category, and session integrations.
- Include Transactions CSS in the pilot. Keep screen and component styles with their owners, move Transactions-specific dark-theme rules out of the central theme stylesheet where practical, and retain global theme tokens at the application level.
- Add architecture guidance and enforceable checks for migrated code; update the existing project-structure documentation and OpenSpec project context after the implementation establishes the new conventions.
- Preserve existing routes, API contracts, URL filter and return-navigation behavior, keyboard and focus behavior, light and dark themes, English and Russian text, currency display, and responsive layouts.

Out of scope: a visual redesign, backend work, new transaction behavior, a new state-management library, and complete migration of Accounts, Categories, Goals, Budgets, Dashboard, Auth, or other legacy areas in this change. Those areas follow the standard when they are migrated in later changes.

## Capabilities

### New Capabilities

None. This change concerns internal architecture, tooling, documentation, and behavior-preserving refactoring.

### Modified Capabilities

None. The existing `transaction-filters` specification remains the behavioral contract; this change does not alter its requirements. This pure refactor declares `skip_specs: true` in change metadata.

## Impact

- Frontend: `src/features/transactions`, `src/app/AppRouter.tsx`, Transactions-specific styling in `src/features/settings/DarkTheme.css`, and the existing navigation and shared UI integration points used by Transactions.
- Architecture/tooling/docs: `src/pages`, any necessary `src/widgets`, `src/entities`, or `src/shared` destinations, `eslint.config.js`, project architecture documentation, and the architecture section of `openspec/config.yaml`.
- Tests: preserve and adapt the existing Transactions, filter, navigation, form, and accessibility tests; add focused tests where extraction makes behavior independently testable.
- APIs and dependencies: retain all current `certis-api` request and response contracts; avoid adding a runtime dependency solely to express FSD layers.
