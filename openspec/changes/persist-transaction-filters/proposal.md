## Why

The Transactions history page keeps its filters only in component state. When a user leaves the page and returns through the application navigation, the page mounts again with the default period, account, category, activity type, and search query. Re-applying the same filters adds avoidable friction when reviewing a focused slice of transaction history.

## What Changes

- Preserve transaction-history filter state for the lifetime of the current browser tab and restore it when the user returns to the Transactions page or reloads it.
- Persist the selected period preset and applied custom date range, account filter, category filter, activity type, and search query.
- Treat persisted state as untrusted input and fall back safely when stored values are malformed or no longer valid.
- Preserve the existing URL-driven `view=recurring` behavior; recurring-view state is not moved into filter persistence.
- Keep the existing backend transaction query contract unchanged.
- Keep category-spending currency selection and other non-filter UI state out of scope.

## Capabilities

### New Capabilities

- `transaction-filter-persistence`: Preserve and safely restore Transactions history filter state within the current browser-tab session.

### Modified Capabilities

None.

## Impact

- Affected feature: `src/features/transactions`.
- Expected implementation points: `TransactionsPage.tsx`, a feature-scoped persistence helper, and focused transaction page/helper tests.
- Browser storage: `sessionStorage` with a versioned feature-specific key.
- API impact: none; existing `GET /api/v1/transactions` query parameters remain unchanged.
- Localization impact: none expected because no new user-facing copy is required.
