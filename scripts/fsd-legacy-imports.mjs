// Exact transitional dependencies of migrated slices. Keep this list in
// sync with docs/architecture.md; remove entries as their owners migrate.
const page = 'src/pages/transactions'
const owner = 'Transactions page migration'
const accountsPage = 'src/pages/accounts'
const accountsOwner = 'Accounts page migration'
const widget = 'src/widgets/workspace-shell'
const widgetOwner = 'Workspace shell migration'

export const legacyImports = [
  ['src/features/accounts/api/accountsApi', 'account entity extraction'],
  ['src/features/auth/session/SessionContext', 'session API migration'],
  ['src/features/categories/api/categoriesApi', 'category entity extraction'],
  ['src/features/transactions/api/transactionsApi', 'transaction entity extraction'],
  ['src/features/transactions/api/transfersApi', 'transfer entity extraction'],
  ...[
    'DeleteTransactionDialog',
    'TransactionActionMenu',
    'TransactionFormModal',
    'RecurringTransactionsView',
    'ReverseTransferDialog',
    'TransferActionMenu',
    'TransferFormModal',
  ].map((name) => [
    `src/features/transactions/components/${name}`,
    'transaction action/recurring migration',
  ]),
  ...['DateTimeField', 'Select', 'Icons'].map((name) => [
    `src/components/${name}`,
    'shared UI migration',
  ]),
  ['src/i18n/useLanguage', 'localization API migration'],
].map(([target, removeWhen]) => ({source: page, target, owner, removeWhen})).concat(
  [
    ['src/features/accounts/api/accountsApi', 'account entity extraction'],
    ['src/features/accounts/components/AccountFormModal', 'account action workflow migration'],
    ['src/features/accounts/components/CloseAccountDialog', 'account action workflow migration'],
    ['src/features/accounts/components/AccountActionMenu', 'account action workflow migration'],
    ['src/components/Select', 'shared UI migration'],
    ['src/components/Icons', 'shared UI migration'],
    ['src/i18n/useLanguage', 'localization API migration'],
  ].map(([target, removeWhen]) => ({source: accountsPage, target, owner: accountsOwner, removeWhen})),
  [
    ['src/components/Icons', 'shared UI migration'],
    ['src/features/auth/session/SessionContext', 'session API migration'],
    ['src/features/profile/ProfileModal', 'profile workflow migration'],
    ['src/features/profile/profilePhoto', 'profile model migration'],
    ['src/features/settings/SettingsModal', 'settings workflow migration'],
  ].map(([target, removeWhen]) => ({source: widget, target, owner: widgetOwner, removeWhen})),
)
