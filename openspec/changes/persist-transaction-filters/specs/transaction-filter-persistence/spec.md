## Purpose

Preserve a user's active Transactions history filters while they move around Certis in the same browser tab, without requiring backend preferences or long-lived cross-session storage.

## ADDED Requirements

### Requirement: Session-scoped transaction filter restoration

The Transactions history page SHALL preserve its active filter state for the current browser-tab session and SHALL restore that state when the user returns to `/transactions` or reloads the page in the same tab.

#### Scenario: Return through application navigation
- **WHEN** a user changes one or more Transactions history filters, navigates to another Certis page, and later returns to Transactions in the same tab
- **THEN** the previously selected filter state is restored

#### Scenario: Reload the Transactions page
- **WHEN** a user reloads the Transactions page after changing filters in the same tab
- **THEN** the previously selected filter state is restored

#### Scenario: No persisted state exists
- **WHEN** the Transactions page opens without valid persisted filter state
- **THEN** the page uses its existing default filter values

### Requirement: Persisted filter coverage

The persisted Transactions history filter state SHALL include the period preset, the applied custom date range when applicable, account filter, category filter, activity type, and search query.

#### Scenario: Custom period is restored
- **WHEN** a user applies a valid custom date range and later returns to Transactions in the same tab
- **THEN** the custom period preset and its applied from/to dates are restored together

#### Scenario: Server-backed and client-side filters are restored
- **WHEN** a user has selected account or category filters and also selected an activity type or entered a search query
- **THEN** all of those selections are restored as one filter state

### Requirement: Persisted state is validated defensively

The Transactions page SHALL treat browser-stored filter data as untrusted input and SHALL fall back to valid defaults instead of failing when persisted data is malformed, unsupported, or stale.

#### Scenario: Malformed stored payload
- **WHEN** the stored filter payload cannot be parsed
- **THEN** the page loads with existing default filters and remains usable

#### Scenario: Unsupported enum or date value
- **WHEN** persisted state contains an unsupported period or activity type, or an invalid custom date
- **THEN** the invalid field falls back to its existing default without invalidating otherwise usable persisted fields

#### Scenario: Stored account or category no longer exists
- **WHEN** a persisted account or category identifier is not present in the currently loaded filter options
- **THEN** that resource-backed filter is cleared while the remaining valid filter state is preserved

### Requirement: Existing view routing remains independent

Filter persistence SHALL NOT replace or remove the existing URL-based Transactions view selection.

#### Scenario: Recurring view remains URL-driven
- **WHEN** the URL contains `view=recurring`
- **THEN** the recurring view opens using the existing routing behavior
- **AND** the saved history filters remain available for the next return to the history view

### Requirement: Existing clear-filter semantics are preserved

The existing "Clear quick filters" action SHALL continue to reset the account filter, category filter, period preset, and custom period to their current defaults, and the persisted representation of those fields SHALL reflect the reset.

#### Scenario: Clear quick filters after restoration
- **WHEN** restored account, category, or period filters are active and the user selects "Clear quick filters"
- **THEN** those quick filters return to their existing defaults
- **AND** a later return to Transactions does not restore the cleared quick-filter values

### Requirement: Backend contracts remain unchanged

Transaction filter persistence SHALL be implemented entirely within Certis Web and SHALL NOT require changes to existing backend endpoints or request contracts.

#### Scenario: Restored filters request transaction data
- **WHEN** account, category, or period filters are restored
- **THEN** transaction data is requested using the same existing `GET /api/v1/transactions` query contract
