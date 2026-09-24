# Proposal

## Why

The Accounts screen combines loading and retry logic, account calculations, search and sorting, modal coordination, and most of its markup in one legacy page. Its page styles and dark-theme overrides are also split across distant files. This makes changes to account management harder to review and raises the risk of breaking balances, actions, or the appearance of the screen. The completed Transactions and workspace-shell migrations provide a bounded FSD pattern for moving this route now.

## What Changes

- Move the `/accounts` route into a `pages/accounts` slice with a narrow public entry point. Separate route data coordination, pure account-list and summary calculations, and page UI by responsibility.
- Move Accounts page CSS and account-owned dark overrides beside their UI owners, including styles currently mixed into the global dark-theme sheet. Keep shared theme primitives and other screens' rules intact.
- Retain the existing account API and create/edit/close components as explicit legacy integrations for this change. Update architecture boundary checks and documentation for the new page; remove the obsolete legacy page after its consumers switch.
- Adapt existing route tests and add focused calculation tests where extraction creates independently testable logic. Verify account operations, currency separation, focus behavior, localization, themes, and responsive layouts without changing their visible behavior.

Out of scope: extracting `entities/account` or moving the account API and action workflows into new slices; changing account request/response contracts, routes, filter persistence, copy, or product behavior; redesigning the screen or refactoring unrelated global styles.

## Capabilities

### New Capabilities

None. This is a behavior-preserving architecture and CSS migration.

### Modified Capabilities

None. The existing `transaction-filters` requirements, including the account filter on Transactions, remain unchanged.

## Impact

- Affected frontend areas: Accounts route and its tests; `src/app/AppRouter.tsx`; Accounts page, action menu, and modal styles; account-specific selectors in `src/features/settings/DarkTheme.css`; FSD boundary checker and architecture documentation.
- Existing `features/accounts/api/accountsApi`, `AccountFormModal`, `CloseAccountDialog`, and `AccountActionMenu` remain functional dependencies until their own migrations. Other consumers of account data, including Dashboard, Goals, and Transactions, keep their current contracts.
- No backend, persisted-data, or localization-key change is planned.
