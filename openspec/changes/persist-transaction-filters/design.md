## Context

`TransactionsPage` already uses React Router search parameters for the top-level history/recurring view: `view=recurring` selects the recurring view. The history filters themselves are local React state:

- period preset and applied custom date range;
- account filter;
- category filter;
- activity type;
- search query.

Account, category, and period filters affect the existing backend transaction request. Activity type and search are applied client-side to the loaded transactions. The workspace sidebar links back to `/transactions` without preserving query parameters, so moving all filters to URL parameters alone would not restore them when a user returns through normal application navigation.

## Goals / Non-Goals

**Goals:**
- Restore Transactions history filters after same-tab navigation away and back.
- Restore the filters after a page reload in the same tab.
- Keep persistence feature-scoped and resilient to malformed browser storage.
- Preserve current filtering behavior, backend requests, and `view=recurring` routing.
- Add automated coverage for serialization/restoration and page behavior.

**Non-Goals:**
- Persist filters across browser sessions or tabs.
- Make filter state shareable through the URL.
- Store filter preferences on the backend or user profile.
- Redesign the Transactions filtering UI.
- Persist recurring-view filters or the category-spending currency selector.
- Change transaction API contracts.

## Decisions

### Use sessionStorage as the persistence boundary

Store history-filter state in `sessionStorage` under a versioned feature-specific key such as `certis.transactions.historyFilters.v1`.

This directly matches the desired lifetime: filters survive component unmounts, route changes, and reloads in the current tab, but a later browser session starts clean.

Alternatives considered:

- **URL search parameters only:** useful for reload, browser history, and shareable links, but the existing sidebar returns to the plain `/transactions` route, so URL-only persistence does not solve the normal "leave and return via navigation" path without broader navigation changes.
- **localStorage:** solves navigation and reload, but retains potentially stale financial filters across later browser sessions, which is more persistence than the current requirement needs.
- **URL + browser storage:** offers deep-linking plus navigation persistence, but adds synchronization and precedence rules that are unnecessary for the first SDD pilot.

### Keep persistence logic inside the transactions feature

Introduce a small feature-scoped module for the persisted state shape, storage key, parsing, sanitization, reading, and writing. `TransactionsPage` should consume this module rather than embedding JSON/storage handling directly in the component.

The stored shape should contain only serializable filter values, not derived data such as `periodRange`, loaded account/category objects, metrics, or transactions.

### Restore state before normal page behavior begins

Use validated persisted values as the initial state for the history filters so the page does not intentionally reset to defaults on every mount. The applied custom range and its editable draft should start from the same restored values when the persisted period is `CUSTOM`.

Storage reads and writes must be guarded so unavailable or failing browser storage never prevents the page from rendering.

### Validate primitive values during deserialization and resource references after loading

The persistence helper should whitelist supported `PeriodPreset` and `ActivityType` values and validate custom dates before returning persisted state.

Account and category identifiers are resource-backed. Once account/category options are loaded, a persisted identifier that no longer exists should be cleared and the corrected state written back. Remaining valid persisted fields should not be discarded.

### Preserve existing filter ownership and semantics

The current URL-based `view` state stays independent from history filter persistence.

The existing "Clear quick filters" button continues to own only the quick-filter fields it currently resets: account, category, period, and custom period. Search and activity type remain controlled by their existing UI and are persisted as they change; this change does not broaden the clear button into a new "reset everything" behavior.

## Risks / Trade-offs

- Restoring stale account/category identifiers may briefly affect an initial transaction request before resource options have been validated. Implementation should minimize unnecessary refetches and ensure the final state is corrected after metadata loads.
- `sessionStorage` is intentionally not shareable and does not provide durable preferences across browser sessions.
- Persisting the search query can restore a page that appears unexpectedly narrow if the user forgets the previous query; session scope limits this surprise, and the existing search control remains visible and editable.
- Adding persistence increases state synchronization responsibilities. Keeping serialization in one feature-scoped helper and testing it separately reduces that risk.
