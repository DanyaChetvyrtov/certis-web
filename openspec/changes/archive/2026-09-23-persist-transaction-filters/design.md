# Design

## Context

See proposal.md for the user problem and the transaction-filters spec for the behavior contract. TransactionsPage currently stores every filter except `view=recurring` in component state. The period, account, and category drive `getAllTransactions`; activity type and search filter the loaded list; spending currency affects only the category diagram. Both workspace menus link to plain `/transactions`. The page already uses React Router search parameters for `view`, and the application already uses guarded session storage elsewhere.

## Goals / Non-Goals

**Goals:**
- Keep one authoritative applied filter state in the Transactions URL, including after Back and Forward.
- Remember only the last Transactions destination needed by the two menus for the current user and tab.
- Preserve existing filtering semantics and API contracts while expanding Reset to all filter controls.

**Non-Goals:**
- Persist transaction results, create server-side saved views, or change transaction API pagination.
- Persist an unsubmitted custom date draft.
- Change filtering behavior inside the recurring-transactions view.

## Decisions

### 1. Parse and serialize a feature-owned filter query

Create a small typed parser/serializer in the Transactions feature and have TransactionsPage derive applied filter values from `useSearchParams` on every render. Use `period`, `from`, `to`, `account`, `category`, `type`, `q`, and `currency` as the owned keys. Keep `view` and any unrelated keys intact when changing or resetting filters. Omit default values: This month, all accounts, all categories, all activity types, empty search, and the effective default spending currency. Store a custom range as local calendar dates (YYYY-MM-DD) and convert to local-day ISO boundaries only when calling the existing API. Store relative preset names instead of absolute dates so they remain relative on a later visit.

The custom date input remains temporary component state. Selecting Custom selects the last applied valid custom range, initially the current month-to-date range; editing From or To does not update the URL until Apply range is selected. Browser navigation reinitializes the draft from the applied URL range. Period, account, and category continue to filter the API request and summary; type and search continue to filter only the history list; currency continues to affect only the spending diagram.

Alternative considered: mirror the URL into independent `useState` values. That creates two writable sources of truth and can show stale controls after browser navigation.

### 2. Use navigation history deliberately

Use a new history entry for discrete choices and Reset so Back can restore the previous applied selection. Search typing updates its query parameter with history replacement, avoiding one Back step per character; navigating away still leaves the final search text in the Transactions history entry. Navigation changes coming from Back or Forward are parsed directly from the URL without writing the old component state over them. Reset removes all owned filter keys in one navigation and retains `view`.

Alternative considered: push on every search keystroke. That would make browser history difficult to use for normal navigation.

### 3. Remember a validated menu destination per user and tab

Add a minimal route destination helper for Transactions, shared by TransactionsPage and workspace navigation. The page records its current `/transactions` pathname and canonical query in `sessionStorage` under a key containing `profile.id`. The desktop sidebar reads that destination for its Transactions link and passes the same destination to MobileWorkspaceNavigation. Directly opened URLs are never overwritten by remembered state on page entry. Reading the stored value validates that it is a same-app Transactions path; unavailable or malformed storage falls back to `/transactions`. Clear the current profile's remembered destination after successful sign-out through the existing sidebar callback. Profile-scoped keys prevent a different signed-in user from receiving the previous user's destination.

This helper belongs with app routing because both the Transactions feature and workspace navigation use it. It stores a URL destination only; filter values are always parsed from the URL. Alternative considered: a React context holding filters. It would not survive refresh on another page and would duplicate the URL state.

### 4. Canonicalize invalid values after required data loads

Validate preset, type, currency code, and date syntax while parsing. A Custom period requires two valid, ordered dates; otherwise use This month. Keep account and category IDs provisionally until their option lists have loaded, then discard IDs absent from those lists. Validate requested spending currency only after the transactions and available currency options are known. Replace the current URL with a canonical version when removing invalid or default-valued owned parameters, preserving unrelated parameters. Do not issue a transaction request with an invalid date range or a known-obsolete account/category ID. Keep loading/error behavior explicit so a failed options request does not silently erase a valid deep link.

Alternative considered: accept arbitrary query values and let the existing range helper return an empty range. An invalid Custom range would then request all dates and misrepresent the active filter.

### 5. Keep the existing API and visual components

Reuse `getAllTransactions`, `getAccounts`, `getAllCategoryCards`, `Select`, and `DateTimeField`. No backend contract, dependency, or visual treatment changes are expected. Broaden the existing Reset label in English and Russian so it accurately describes clearing every filter.

## Risks / Trade-offs

- [Canonicalization or data loading briefly shows the wrong values] → Parse synchronously, wait for option data before ID/currency cleanup, and use history replacement for cleanup.
- [A stale menu URL belongs to another profile or contains an unsafe path] → Scope storage by profile ID, validate the stored pathname, and clear on successful sign-out.
- [Storage is disabled or throws] → Catch read/write errors and let the menu use the plain Transactions route while URL-based Back and direct links continue to work.
- [Search changes produce noisy history] → Replace the current entry while typing; push for discrete filter choices and Reset.
- [A quick navigation follows a filter change before an effect records it] → Update the remembered destination in the same filter navigation path or from the latest location before leaving, rather than relying only on delayed persistence.

## Migration Plan

No data migration is needed. Existing `/transactions` and `?view=recurring` links retain their meanings. The new query keys are optional, so deployment can be rolled back by reverting the frontend change; old clients ignore the added keys.
