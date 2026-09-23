// Exact transitional dependencies of the Transactions page. Keep this list in
// sync with docs/architecture.md; remove entries as their owners migrate.
const page = 'src/pages/transactions'
const owner = 'Transactions page migration'

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
  ['src/layouts/WorkspaceSidebar', 'workspace shell migration'],
  ['src/i18n/useLanguage', 'localization API migration'],
].map(([target, removeWhen]) => ({source: page, target, owner, removeWhen}))
