# Tasks

## 1. URL Filter State

- [x] 1.1 Add typed parsing, validation, and serialization for the Transactions filter query; verify valid values, defaults, custom dates, and preservation of unrelated parameters with focused examples.
- [x] 1.2 Derive applied Transactions filters from the URL and update the URL for period, account, category, activity type, search, and spending currency changes; verify direct URLs and browser Back/Forward show matching controls and results.
- [x] 1.3 Keep the custom date draft separate until Apply range, and make Reset clear every filter control and owned URL parameter, and update its English and Russian label; verify an unapplied draft leaves results unchanged and Reset remains available when only type, search, or currency is non-default.
- [x] 1.4 Validate loaded account/category options and available spending currencies before canonicalizing obsolete values; verify invalid links fall back safely without an unbounded date request or lost unrelated parameters.

## 2. Workspace Navigation

- [x] 2.1 Add a profile-scoped, tab-scoped last Transactions destination helper with safe storage access and route validation; verify a malformed or unavailable stored destination falls back to /transactions.
- [x] 2.2 Connect TransactionsPage and both desktop and mobile menu links to the remembered destination, preserving explicit direct links; verify a menu revisit restores the latest filters after leaving the page.
- [x] 2.3 Clear the current profile's remembered destination after successful sign-out; verify another user in the same tab cannot receive the earlier user's filters.

## 3. Automated Tests

- [x] 3.1 Add unit tests for query parsing and serialization, including defaults, malformed enum values, invalid custom dates, unknown identifiers, and unrelated URL parameters; verify the focused unit suite passes.
- [x] 3.2 Add TransactionsPage integration tests for direct links, refresh/remount, API and client-side filter behavior, custom-range Apply, Reset, and Back/Forward; verify the focused page suite passes.
- [x] 3.3 Add navigation tests for desktop and mobile menu restoration, profile separation, sign-out cleanup, explicit-link precedence, and storage failure fallback; verify the focused navigation suite passes.

## 4. Verification

- [x] 4.1 Run npm run lint and verify it exits successfully.
- [x] 4.2 Run npm test and verify the full suite passes.
- [x] 4.3 Run npm run build and verify the production build succeeds.
