## 1. Filter persistence model

- [ ] 1.1 Add a feature-scoped persisted filter-state type, versioned sessionStorage key, and safe read/write helpers for period, applied custom dates, account, category, activity type, and search query.
- [ ] 1.2 Validate supported enum/date values during deserialization and fall back per field without discarding unrelated valid persisted values.
- [ ] 1.3 Add focused unit tests for valid restoration, malformed payloads, invalid enum/date values, and storage read/write failures.

## 2. Transactions page integration

- [ ] 2.1 Initialize Transactions history filter state from the persistence helper while preserving the existing defaults when no valid stored state exists.
- [ ] 2.2 Keep applied custom dates and the custom-period draft synchronized when restoring a persisted custom range.
- [ ] 2.3 Persist filter changes without including derived transaction data, spending currency, or the existing URL-driven `view` state.
- [ ] 2.4 After account/category options load, clear stale persisted resource identifiers and write back the corrected state.
- [ ] 2.5 Ensure the existing "Clear quick filters" action also updates persisted quick-filter state while leaving search/activity reset semantics unchanged.

## 3. Behavior verification

- [ ] 3.1 Add Transactions page tests proving filters survive an unmount/remount in the same browser session and are reflected in the existing transaction request/client-side filtering behavior.
- [ ] 3.2 Add coverage for restoring a custom date range and for clearing restored quick filters.
- [ ] 3.3 Add coverage that `view=recurring` remains URL-driven and independent from persisted history filters.
- [ ] 3.4 Confirm no new user-facing copy is introduced; update RU/EN localization only if implementation requires new text.

## 4. Project verification

- [ ] 4.1 Run `npm run lint`.
- [ ] 4.2 Run `npm test`.
- [ ] 4.3 Run `npm run build`.
