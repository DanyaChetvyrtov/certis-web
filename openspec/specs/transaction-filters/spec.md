# transaction-filters Specification

## Purpose

Let users return to the same filtered Transactions history through browser navigation, a direct link, or the workspace menu, while keeping the URL and visible results in agreement.

## Requirements

### Requirement: Transaction history filters are represented in the URL
The system SHALL represent the applied period, custom date range, account, category, activity type, search text, and spending currency in Transactions URL search parameters. It SHALL omit parameters whose controls have their default values and SHALL derive the controls and displayed data from the current URL.

#### Scenario: Open a filtered link
- **WHEN** a user opens a Transactions URL containing valid filter parameters
- **THEN** the corresponding controls show those values and the history, summary, and spending diagram reflect the applicable filters

#### Scenario: Refresh a filtered page
- **WHEN** a user refreshes a filtered Transactions URL
- **THEN** the same applied filters and corresponding results are restored

#### Scenario: Open an unfiltered link
- **WHEN** a user opens /transactions without filter parameters
- **THEN** all filter controls show their defaults

### Requirement: Custom date ranges are committed only when applied
The system SHALL keep unsubmitted custom date edits separate from the applied range and SHALL represent only an applied, valid range in the URL. Relative period presets SHALL retain their relative meaning when the page is opened later.

#### Scenario: Edit a custom range without applying it
- **WHEN** a user changes the From or To field without selecting Apply range
- **THEN** the URL and the applied transaction date range remain unchanged

#### Scenario: Apply a valid custom range
- **WHEN** a user applies a valid custom date range
- **THEN** the URL represents that range and transactions are filtered by those dates

#### Scenario: Reopen a relative period later
- **WHEN** a user reopens a URL using the This month preset in a later month
- **THEN** the date range is calculated for the current month

### Requirement: Browser history restores filter state
The system SHALL restore Transactions filter controls and results from the URL when the user navigates Back or Forward.

#### Scenario: Return from another page with Back
- **WHEN** a user changes Transactions filters, visits another page, and navigates Back
- **THEN** the previously selected Transactions filters and results are restored

#### Scenario: Navigate Back after changing a discrete filter
- **WHEN** a user changes a discrete filter and navigates Back to an earlier Transactions URL
- **THEN** the controls and results match that earlier URL

### Requirement: Workspace navigation returns to the last filtered Transactions URL
The system SHALL make the desktop and mobile Transactions menu destinations restore the last Transactions URL visited in the same browser tab by the current user. An explicitly opened Transactions URL SHALL take precedence over the remembered menu destination. A remembered destination from a different user SHALL NOT be applied.

#### Scenario: Return through desktop or mobile menu
- **WHEN** a user leaves a filtered Transactions page and selects Transactions in either workspace menu
- **THEN** the last Transactions URL and its filters are restored

#### Scenario: Open an explicit link
- **WHEN** a user opens a Transactions link with its own filter parameters
- **THEN** those parameters determine the page state regardless of a previously remembered menu destination

#### Scenario: Another user signs in
- **WHEN** a different user signs in in the same browser tab and selects Transactions
- **THEN** the previous user's remembered filters are not restored

### Requirement: Reset clears the complete filter state
The system SHALL make Reset available whenever any filter is non-default and SHALL return the period, account, category, activity type, search text, and spending currency to their defaults and remove all corresponding filter parameters from the URL. Reset SHALL preserve unrelated URL parameters, including the existing view parameter, and its prior filter state SHALL remain reachable with browser Back.

#### Scenario: Reset all selected filters
- **WHEN** a user selects Reset after changing filters in any of those controls
- **THEN** every filter control returns to its default and every filter parameter is absent from the URL

#### Scenario: Preserve an unrelated parameter
- **WHEN** a user selects Reset on a Transactions history URL with an unrelated parameter
- **THEN** the unrelated parameter remains unchanged

#### Scenario: Back after Reset
- **WHEN** a user selects Reset and then navigates Back
- **THEN** the filters represented by the earlier URL are restored

### Requirement: Invalid or obsolete filter parameters fail safely
The system SHALL ignore invalid filter values and identifiers that are no longer available to the user, return their controls to valid defaults, and remove the invalid filter parameters without causing an error page or an unintended unbounded date query.

#### Scenario: Invalid custom dates
- **WHEN** a Transactions URL contains an invalid or reversed custom date range
- **THEN** the period returns to its default and the invalid date parameters are removed

#### Scenario: Deleted account or category
- **WHEN** a Transactions URL names an account or category that is no longer available
- **THEN** the corresponding control returns to its default and its invalid parameter is removed

#### Scenario: Unavailable spending currency
- **WHEN** a Transactions URL requests a spending currency unavailable for the current filtered data
- **THEN** the diagram uses a valid available currency and the invalid currency parameter is removed
