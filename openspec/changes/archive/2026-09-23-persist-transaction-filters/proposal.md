# Proposal

## Why

Selected filters on the Transactions page are lost when a user leaves the page and returns. Restoring the same view currently requires reselecting the period, account, category, activity type, search text, and spending currency.

## What Changes

- Represent the applied Transactions history filters in URL search parameters, omitting default values. Opening a filtered URL, refreshing it, or using browser Back and Forward restores the corresponding controls and results.
- Make the desktop and mobile Transactions menu links reopen the user's last filtered Transactions URL in the current browser tab.
- Make Reset restore every filter control to its default and remove all filter parameters from the URL. Preserve unrelated parameters such as the existing `view` parameter.
- Handle malformed or obsolete filter values safely, including invalid custom dates and account or category identifiers that no longer exist.

## Capabilities

### New Capabilities

- `transaction-filters`: URL-backed Transactions history filter state, navigation restoration, and complete reset behavior.

### Modified Capabilities

None. The project has no existing OpenSpec capabilities.

## Impact

- Affected features: Transactions history, desktop and mobile workspace navigation, and session cleanup for the remembered menu destination.
- Existing transaction, account, category, and transfer API contracts remain unchanged. No new dependency or backend storage is required.
- Out of scope: saved filters across devices or browser tabs, persistence after closing the tab, and changes to recurring transaction filtering or page layout.
