# Application architecture

Feature-Sliced Design (FSD) is the placement rule for **new product code**. The
Transactions and Accounts routes are migrated pages, and `widgets/workspace-shell`
owns the navigation used by all six protected screens. Existing broad modules under
`src/features/*` remain legacy until their own migration; a maintenance change
inside one of them does not require moving the whole module.

## Layers and ownership

Dependencies point downward: `app → pages → widgets → features → entities →
shared`. A slice may import another slice only through its `index.ts` public
API. Files inside one slice may import each other directly. `app` composes
providers and routes; `shared` holds product-independent primitives. Add a
`widgets` or `entities` slice only when it owns real reusable code, never as a
re-export of a legacy folder.

| Layer | Responsibility | Certis example |
| --- | --- | --- |
| `app` | Routing and application setup | `AppRouter` |
| `pages` | Route composition, route-local state and data | `pages/transactions`, `pages/accounts` |
| `widgets` | Reusable composed screen blocks | `widgets/workspace-shell` |
| `features` | User actions and workflows | `transaction-navigation` remembers the last Transactions URL |
| `entities` | Reusable domain data and presentation | Add when transaction/account models have independent owners |
| `shared` | Generic API, controls, utilities | `shared/api/client` |

Place URL filter coordination, metrics, activity grouping, and screen sections
in `pages/transactions/{model,ui}`. Its route entry is
`pages/transactions/index.ts`. The Accounts route follows the same placement in
`pages/accounts/{model,ui}` and enters through `pages/accounts/index.ts`.
Keep CSS beside the UI that owns its selectors:
page layout and responsive rules beside the page, form/dialog rules beside the
form/dialog. Global theme variables and document-level theme selection remain
application concerns. Use the existing class names and `data-theme` selectors
when migrating CSS so the theme and responsive behavior stay stable.

## Legacy transition

New standalone routes use `pages/<slice>` and new workflows use
`features/<slice>`. The older `src/features/accounts`, `auth`, `categories`,
`transactions`, etc. are not yet FSD slices. `src/components` and `src/i18n`
are also transitional top-level folders. They may be maintained
in place; new migrated slices can use only the exact integrations below. The
machine-readable list in `scripts/fsd-legacy-imports.mjs` is checked by
`npm run lint:architecture` and carries the owner and removal point.

| Migrated consumer | Allowed legacy modules | Removal point |
| --- | --- | --- |
| `pages/transactions` | `features/accounts/api/accountsApi`, `features/auth/session/SessionContext`, `features/categories/api/categoriesApi` | Extract account/category entities and session public API |
| `pages/transactions` | `features/transactions/api/{transactionsApi,transfersApi}` | Extract transaction/transfer entities |
| `pages/transactions` | `features/transactions/components/{DeleteTransactionDialog,TransactionActionMenu,TransactionFormModal,RecurringTransactionsView,ReverseTransferDialog,TransferActionMenu,TransferFormModal}` | Migrate each action and recurring workflow |
| `pages/transactions` | `components/{DateTimeField,Select,Icons}`, `i18n/useLanguage` | Migrate shared UI and localization APIs |
| `pages/accounts` | `features/accounts/api/accountsApi` | Extract account entity |
| `pages/accounts` | `features/accounts/components/{AccountFormModal,CloseAccountDialog,AccountActionMenu}` | Migrate account action workflows |
| `pages/accounts` | `components/{Select,Icons}`, `i18n/useLanguage` | Migrate shared UI and localization APIs |
| `widgets/workspace-shell` | `components/Icons` | Migrate shared UI |
| `widgets/workspace-shell` | `features/auth/session/SessionContext` | Migrate session public API |
| `widgets/workspace-shell` | `features/profile/{ProfileModal,profilePhoto}` | Migrate profile workflow and model |
| `widgets/workspace-shell` | `features/settings/SettingsModal` | Migrate settings workflow |

The list is exact by target module, not a directory wildcard. Add an exception
only with a named owner and intended removal point. Do not import a page or
`app` from a lower layer to bridge a transition. Remove exceptions as owners
migrate. The boundary check currently covers production files in
`pages/transactions`, `pages/accounts`, `widgets/workspace-shell`, and
`features/transaction-navigation`; other legacy internals will join when
migrated. Dashboard in `pages/DashboardPage.tsx` and the
Budgets, Goals, and Categories pages under legacy `features/*` consume
`widgets/workspace-shell` during this transition. Their upward imports are not
treated as migrated-slice code; each will move to a `pages/*` slice in a later
change.
