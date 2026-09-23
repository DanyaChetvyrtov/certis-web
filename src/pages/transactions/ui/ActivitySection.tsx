import type {RefObject} from 'react'
import {useTranslation} from 'react-i18next'
import type {Account} from '../../../features/accounts/api/accountsApi'
import type {Category} from '../../../features/categories/api/categoriesApi'
import {isCategoryIcon} from '../../../features/categories/api/categoriesApi'
import type {Transaction} from '../../../features/transactions/api/transactionsApi'
import type {Transfer} from '../../../features/transactions/api/transfersApi'
import {TransactionActionMenu} from '../../../features/transactions/components/TransactionActionMenu'
import {TransferActionMenu} from '../../../features/transactions/components/TransferActionMenu'
import {Icon} from '../../../components/Icons'
import type {IconName} from '../../../components/Icons'
import type {ActivityType, TransactionFilterState} from '../model/transactionFilters'
import type {LoadState} from '../model/useTransactionsData'
import {groupDateKey} from '../model/selectors'
import {accentStyle, formatGroupHeading, formatMoney, transactionTitle} from './presentation'

export function ActivitySection({
    locale, searchQuery, updateFilters, quickFiltersRef, dateLabel,
    activityType, loadState, loadError, reloadWorkspace,
    visibleTransactions, transactionsCount, groupedTransactions, anchorDate,
    accountMap, categoryMap, transferMap, reversedTransferIds,
    openForm, openDeleteDialog, openReverseTransfer,
}: {
    locale: string
    searchQuery: string
    updateFilters: (changes: Partial<TransactionFilterState>, replace?: boolean) => void
    quickFiltersRef: RefObject<HTMLElement | null>
    dateLabel: string
    activityType: ActivityType
    loadState: LoadState
    loadError: string
    reloadWorkspace: () => void
    visibleTransactions: Transaction[]
    transactionsCount: number
    groupedTransactions: Transaction[][]
    anchorDate: Date
    accountMap: Map<string, Account>
    categoryMap: Map<string, Category>
    transferMap: Map<string, Transfer>
    reversedTransferIds: Set<string>
    openForm: (transaction: Transaction | undefined, restoreFocusTarget: HTMLElement) => void
    openDeleteDialog: (transaction: Transaction, restoreFocusTarget: HTMLButtonElement) => void
    openReverseTransfer: (transfer: Transfer, restoreFocusTarget: HTMLButtonElement) => void
}) {
    const {t} = useTranslation()
    return (
                    <section className="transaction-activity-card">
                        <header className="transaction-activity-heading">
                            <div>
                                <h2>{t('transactions.activity')}</h2>
                                <p>{t('transactions.activitySubtitle')}</p>
                            </div>

                            <div className="transaction-activity-tools">
                                <label className="transaction-search-field">
                                    <Icon name="search"/>
                                    <span className="sr-only">
                                        {t('transactions.search')}
                                    </span>
                                    <input
                                        type="search"
                                        value={searchQuery}
                                        placeholder={t('transactions.search')}
                                        onChange={(event) =>
                                            updateFilters({searchQuery: event.target.value}, true)
                                        }
                                    />
                                </label>

                                <button
                                    type="button"
                                    onClick={() => quickFiltersRef.current?.scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'center',
                                    })}
                                >
                                    <Icon name="list"/>
                                    {t('transactions.filters')}
                                </button>

                                <span>
                                    <Icon name="calendar"/>
                                    {dateLabel}
                                </span>
                            </div>
                        </header>

                        <div className="transaction-activity-controls">
                            <div
                                className="transaction-type-tabs"
                                role="tablist"
                                aria-label={t('transactions.transactionType')}
                            >
                                {(['ALL', 'INCOME', 'EXPENSE', 'TRANSFER'] as const)
                                    .map((type) => (
                                        <button
                                            className={
                                                activityType === type
                                                    ? 'active'
                                                    : undefined
                                            }
                                            type="button"
                                            role="tab"
                                            aria-selected={activityType === type}
                                            key={type}
                                            onClick={() => updateFilters({activityType: type})}
                                        >
                                            {t(`transactions.activityTypes.${type}`)}
                                        </button>
                                    ))}
                            </div>

                            <div className="transaction-column-headings">
                                <span>{t('transactions.columns.category')}</span>
                                <span>{t('transactions.columns.account')}</span>
                                <span>{t('transactions.columns.time')}</span>
                                <span>{t('transactions.columns.amount')}</span>
                                <span aria-hidden="true"/>
                            </div>
                        </div>

                        <div
                            className="transaction-list"
                            role="tabpanel"
                        >
                            {loadState === 'loading' && (
                                <div
                                    className="transaction-loading-state"
                                    aria-label={t('transactions.loading')}
                                >
                                    {[0, 1, 2, 3, 4].map((item) => (
                                        <span key={item}/>
                                    ))}
                                </div>
                            )}

                            {loadState === 'error' && (
                                <div
                                    className="transaction-empty-state"
                                    role="alert"
                                >
                                    <span><Icon name="alert"/></span>
                                    <h3>{t('transactions.loadTitle')}</h3>
                                    <p>{loadError}</p>
                                    <button
                                        type="button"
                                        onClick={reloadWorkspace}
                                    >
                                        {t('transactions.tryAgain')}
                                    </button>
                                </div>
                            )}

                            {loadState === 'ready'
                                && visibleTransactions.length === 0
                                && (
                                    <div className="transaction-empty-state">
                                        <span>
                                            <Icon
                                                name={
                                                    transactionsCount === 0
                                                        ? 'receipt'
                                                        : 'search'
                                                }
                                            />
                                        </span>
                                        <h3>
                                            {transactionsCount === 0
                                                ? t('transactions.noTransactions')
                                                : t('transactions.notFound')}
                                        </h3>
                                        <p>
                                            {transactionsCount === 0
                                                ? t('transactions.firstDescription')
                                                : t('transactions.filterDescription')}
                                        </p>
                                        {transactionsCount === 0 && (
                                            <button
                                                type="button"
                                                onClick={(event) =>
                                                    openForm(
                                                        undefined,
                                                        event.currentTarget,
                                                    )
                                                }
                                            >
                                                {t('transactions.addTransaction')}
                                            </button>
                                        )}
                                    </div>
                                )}

                            {loadState === 'ready'
                                && groupedTransactions.map((group) => (
                                    <section
                                        className="transaction-date-group"
                                        key={groupDateKey(group[0].occurredAt)}
                                    >
                                        <h3>
                                            {formatGroupHeading(
                                                group[0].occurredAt,
                                                anchorDate,
                                                locale,
                                                t,
                                            )}
                                        </h3>

                                        {group.map((transaction) => {
                                            const account = accountMap.get(
                                                transaction.accountId,
                                            )
                                            const category = transaction.categoryId
                                                ? categoryMap.get(
                                                    transaction.categoryId,
                                                )
                                                : undefined
                                            const transfer = transaction.transferId
                                                ? transferMap.get(transaction.transferId)
                                                : undefined
                                            const sourceAccount = transfer
                                                ? accountMap.get(transfer.sourceAccountId)
                                                : undefined
                                            const destinationAccount = transfer
                                                ? accountMap.get(transfer.destinationAccountId)
                                                : undefined
                                            const isReversal = Boolean(
                                                transfer?.reversalOfTransferId,
                                            )
                                            const isReversed = transfer
                                                ? reversedTransferIds.has(transfer.id)
                                                : false
                                            const transferLabel = transfer
                                                ? `${sourceAccount?.name ?? t('transactions.unknownAccount')} → ${destinationAccount?.name ?? t('transactions.unknownAccount')}`
                                                : ''
                                            const icon: IconName = transfer
                                                ? 'transfer'
                                                : category
                                                && isCategoryIcon(category.icon)
                                                ? category.icon
                                                : transaction.type === 'INCOME'
                                                    ? 'cash'
                                                    : 'receipt'
                                            const accent = transfer
                                                ? '#6174c9'
                                                : category?.color
                                                ?? (transaction.type === 'INCOME'
                                                    ? '#10b981'
                                                    : '#df655e')

                                            return (
                                                <article
                                                    className="transaction-row"
                                                    key={transfer?.id ?? transaction.id}
                                                    style={accentStyle(accent)}
                                                >
                                                    <div className="transaction-identity">
                                                        <span>
                                                            <Icon name={icon}/>
                                                        </span>
                                                        <div>
                                                            <strong>
                                                                {transfer
                                                                    ? isReversal
                                                                        ? `${t('transactions.reversal')} · ${transferLabel}`
                                                                        : transferLabel
                                                                    : transactionTitle(transaction, t)}
                                                            </strong>
                                                            <small>
                                                                {transfer
                                                                    ? transfer.note?.trim()
                                                                        || (isReversal
                                                                            ? t('transactions.transferReversal')
                                                                            : isReversed
                                                                                ? t('transactions.reversedTransfer')
                                                                                : t('transactions.accountTransfer'))
                                                                    : transaction.note?.trim()
                                                                    || (transaction.recurringTransactionTemplateId
                                                                        ? t('transactions.recurringTransaction')
                                                                        : transaction.type === 'INCOME'
                                                                            ? t('transactions.recordedIncome')
                                                                            : t('transactions.recordedExpense'))}
                                                            </small>
                                                            <em>
                                                                {transfer
                                                                    ? `${t('transactions.transfer')} · ${transferLabel}`
                                                                    : `${category?.name ?? t('transactions.uncategorized')} · ${account?.name ?? t('transactions.unknownAccount')}`}
                                                            </em>
                                                        </div>
                                                    </div>

                                                    <div className="transaction-details">
                                                        <span className="transaction-category-cell">
                                                            {transfer
                                                                ? isReversal
                                                                    ? t('transactions.reversal')
                                                                    : t('transactions.transfer')
                                                                : category?.name ?? t('transactions.uncategorized')}
                                                        </span>

                                                        <span className="transaction-account-cell">
                                                            {transfer
                                                                ? transferLabel
                                                                : account?.name ?? t('transactions.unknownAccount')}
                                                        </span>

                                                        <time dateTime={transaction.occurredAt}>
                                                            {new Date(transaction.occurredAt)
                                                                .toLocaleTimeString(
                                                                    locale,
                                                                    {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                        hour12: false,
                                                                    },
                                                                )}
                                                        </time>

                                                        <strong
                                                            className={
                                                                transfer
                                                                    ? 'transaction-amount transfer'
                                                                    : transaction.type === 'INCOME'
                                                                    ? 'transaction-amount income'
                                                                    : 'transaction-amount expense'
                                                            }
                                                        >
                                                            {transfer
                                                                ? formatMoney(
                                                                    transfer.amount,
                                                                    transfer.currency,
                                                                    locale,
                                                                )
                                                                : account
                                                                ? formatMoney(
                                                                    transaction.type === 'INCOME'
                                                                        ? transaction.amount
                                                                        : -transaction.amount,
                                                                    account.currency,
                                                                    locale,
                                                                    transaction.type === 'INCOME',
                                                                )
                                                                : transaction.amount}
                                                        </strong>

                                                        {transfer
                                                            ? !isReversal && !isReversed
                                                                ? (
                                                                    <TransferActionMenu
                                                                        transfer={transfer}
                                                                        label={transferLabel}
                                                                        onReverse={openReverseTransfer}
                                                                    />
                                                                )
                                                                : (
                                                                    <span className="transfer-state-pill">
                                                                        {isReversal ? t('transactions.reversal') : t('transactions.reversed')}
                                                                    </span>
                                                                )
                                                            : (
                                                                <TransactionActionMenu
                                                                    transaction={transaction}
                                                                    onEdit={(
                                                                        transactionToEdit,
                                                                        restoreFocusTarget,
                                                                    ) => openForm(
                                                                        transactionToEdit,
                                                                        restoreFocusTarget,
                                                                    )}
                                                                    onDelete={openDeleteDialog}
                                                                />
                                                            )}
                                                    </div>
                                                </article>
                                            )
                                        })}
                                    </section>
                                ))}
                        </div>
                    </section>
    )
}
