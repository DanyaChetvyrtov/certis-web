import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import {useTranslation} from 'react-i18next'
import {
    Icon,
} from '../../../components/Icons'
import {
    WorkspaceSidebar,
} from '../../../widgets/workspace-shell'
import {useSession} from '../../../features/auth/session/SessionContext'
import type {
    Transaction,
} from '../../../features/transactions/api/transactionsApi'
import type {
    Transfer,
} from '../../../features/transactions/api/transfersApi'
import {
    DeleteTransactionDialog,
} from '../../../features/transactions/components/DeleteTransactionDialog'
import {
    TransactionFormModal,
} from '../../../features/transactions/components/TransactionFormModal'
import {
    RecurringTransactionsView,
} from '../../../features/transactions/components/RecurringTransactionsView'
import {
    ReverseTransferDialog,
} from '../../../features/transactions/components/ReverseTransferDialog'
import {
    TransferFormModal,
} from '../../../features/transactions/components/TransferFormModal'
import {useLanguage} from '../../../i18n/useLanguage'
import {
    getSpendingByCategory,
    getSpendingCurrencyOptions,
    getTransactionMetrics,
    getVisibleTransactions,
    groupTransactionsByDate,
    matchesTransactionFilters,
} from '../model/selectors'
import {useTransactionsData} from '../model/useTransactionsData'
import {
    useTransactionFilterControls,
    useTransactionUrlState,
} from '../model/useTransactionsUrlFilters'
import {ActivitySection} from './ActivitySection'
import {MetricsSection} from './MetricsSection'
import {QuickFiltersSection} from './QuickFiltersSection'
import {SpendingSection} from './SpendingSection'
import {formatPeriodLabel} from './presentation'
import './TransactionsPage.css'
import './TransactionsDarkTheme.css'

type Notice = {
    kind: 'success' | 'error'
    message: string
}

type FormState = {
    transaction?: Transaction
    restoreFocus: () => void
}

type DeleteState = {
    transaction: Transaction
    restoreFocus: () => void
}

type TransferFormState = {
    restoreFocus: () => void
}

type ReverseTransferState = {
    transfer: Transfer
    restoreFocus: () => void
}

export function TransactionsPage() {
    const {t} = useTranslation()
    const {locale} = useLanguage()
    const {profile} = useSession()
    const preferredCurrency = profile?.preferredCurrency ?? 'RUB'
    const {
        searchParams, setSearchParams, locationKey, anchorDate,
        parsedFilters, activeView, setActiveView,
    } = useTransactionUrlState(profile?.id)
    const {
        transactions, setTransactions,
        transfers, setTransfers,
        accounts, categories,
        resourceState, transactionState, loadedQueryKey,
        transactionQueryKey, loadError, filters, periodRange,
        loadState, reloadWorkspace,
    } = useTransactionsData({
        anchorDate,
        preferredCurrency,
        parsedFilters,
        loadErrorFallback: t('transactions.loadError'),
    })
    const [formState, setFormState] =
        useState<FormState | null>(null)
    const [deleteState, setDeleteState] =
        useState<DeleteState | null>(null)
    const [transferFormState, setTransferFormState] =
        useState<TransferFormState | null>(null)
    const [reverseTransferState, setReverseTransferState] =
        useState<ReverseTransferState | null>(null)
    const [notice, setNotice] = useState<Notice | null>(null)
    const newTransactionButtonRef = useRef<HTMLButtonElement>(null)
    const newTransferButtonRef = useRef<HTMLButtonElement>(null)
    const quickFiltersRef = useRef<HTMLElement>(null)

    const period = filters.period
    const customPeriod = filters.customPeriod
    const accountFilter = filters.accountId
    const categoryFilter = filters.categoryId
    const activityType = filters.activityType
    const searchQuery = filters.searchQuery
    useEffect(() => {
        if (!notice) {
            return
        }

        const timeoutId = window.setTimeout(
            () => setNotice(null),
            3400,
        )

        return () => window.clearTimeout(timeoutId)
    }, [notice])

    const accountMap = useMemo(
        () => new Map(
            accounts.map((account) => [account.id, account]),
        ),
        [accounts],
    )

    const categoryMap = useMemo(
        () => new Map(
            categories.map((category) => [category.id, category]),
        ),
        [categories],
    )

    const transferMap = useMemo(
        () => new Map(
            transfers.map((transfer) => [transfer.id, transfer]),
        ),
        [transfers],
    )

    const reversedTransferIds = useMemo(
        () => new Set(
            transfers.flatMap((transfer) =>
                transfer.reversalOfTransferId
                    ? [transfer.reversalOfTransferId]
                    : [],
            ),
        ),
        [transfers],
    )

    const selectedAccount = accountFilter
        ? accountMap.get(accountFilter)
        : undefined

    const spendingCurrencyOptions = useMemo(
        () => getSpendingCurrencyOptions(
            transactions, accountMap, selectedAccount, preferredCurrency,
        ),
        [transactions, accountMap, selectedAccount, preferredCurrency],
    )

    const resultsMatchFilters = transactionState === 'ready'
        && loadedQueryKey === transactionQueryKey
    const {
        lastCustomPeriod, setLastCustomPeriod,
        customPeriodDraft, setCustomPeriodDraft,
        customPeriodIsReversed, canApplyCustomPeriod,
        defaultSpendingCurrency, canonicalFilters, updateFilters,
    } = useTransactionFilterControls({
        searchParams, setSearchParams, locationKey, anchorDate,
        profileId: profile?.id, filters, preferredCurrency,
        spendingCurrencyOptions, resourceState, resultsMatchFilters,
    })
    const requestedSpendingCurrency = filters.currency ?? defaultSpendingCurrency
    const spendingCurrency = spendingCurrencyOptions.includes(
        requestedSpendingCurrency,
    ) ? requestedSpendingCurrency : defaultSpendingCurrency

    const metrics = useMemo(
        () => getTransactionMetrics(transactions, accountMap),
        [transactions, accountMap],
    )

    const spendingByCategory = useMemo(
        () => getSpendingByCategory(
            transactions, accountMap, categoryMap, spendingCurrency,
            {
                uncategorized: t('transactions.uncategorized'),
                other: t('transactions.other'),
            },
        ),
        [transactions, accountMap, categoryMap, spendingCurrency, t],
    )

    const recurringCount = transactions.filter(
        (transaction) => Boolean(transaction.recurringTransactionTemplateId),
    ).length

    const visibleTransactions = useMemo(
        () => getVisibleTransactions(
            transactions, activityType, searchQuery,
            accountMap, categoryMap, transferMap,
        ),
        [transactions, activityType, searchQuery, accountMap, categoryMap, transferMap],
    )
    const groupedTransactions = useMemo(
        () => groupTransactionsByDate(visibleTransactions),
        [visibleTransactions],
    )
    const matchesCurrentFilters = (transaction: Transaction): boolean =>
        matchesTransactionFilters(
            transaction, accountFilter, categoryFilter, periodRange,
        )

    const openForm = (
        transaction: Transaction | undefined,
        restoreFocusTarget: HTMLElement,
    ) => {
        setFormState({
            transaction,
            restoreFocus: () => restoreFocusTarget.focus(),
        })
    }

    const openDeleteDialog = (
        transaction: Transaction,
        restoreFocusTarget: HTMLButtonElement,
    ) => {
        setDeleteState({
            transaction,
            restoreFocus: () => restoreFocusTarget.focus(),
        })
    }

    const handleSaved = (
        savedTransaction: Transaction,
        isEditing: boolean,
    ) => {
        setTransactions((current) => {
            const withoutSaved = current.filter(
                (transaction) => transaction.id !== savedTransaction.id,
            )

            return matchesCurrentFilters(savedTransaction)
                ? [savedTransaction, ...withoutSaved]
                : withoutSaved
        })
        setFormState(null)
        setNotice({
            kind: 'success',
            message: isEditing
                ? t('transactions.notice.updated')
                : matchesCurrentFilters(savedTransaction)
                    ? t('transactions.notice.added')
                    : t('transactions.notice.outside'),
        })
    }

    const handleDeleted = (
        deletedTransaction: Transaction,
    ) => {
        setTransactions((current) => current.filter(
            (transaction) => transaction.id !== deletedTransaction.id,
        ))
        setDeleteState(null)
        setNotice({
            kind: 'success',
            message: t('transactions.notice.deleted'),
        })
    }

    const handleTransferSaved = (savedTransfer: Transfer) => {
        setTransfers((current) => [
            savedTransfer,
            ...current.filter((transfer) => transfer.id !== savedTransfer.id),
        ])
        setTransferFormState(null)
        setNotice({
            kind: 'success',
            message: t('transactions.notice.transfer'),
        })
        reloadWorkspace()
    }

    const openTransferForm = (restoreFocusTarget: HTMLButtonElement) => {
        setTransferFormState({
            restoreFocus: () => restoreFocusTarget.focus(),
        })
    }

    const openReverseTransfer = (
        transfer: Transfer,
        restoreFocusTarget: HTMLButtonElement,
    ) => {
        setReverseTransferState({
            transfer,
            restoreFocus: () => restoreFocusTarget.focus(),
        })
    }

    const handleTransferReversed = (reversal: Transfer) => {
        setTransfers((current) => [reversal, ...current])
        setReverseTransferState(null)
        setNotice({
            kind: 'success',
            message: t('transactions.notice.reversed'),
        })
        reloadWorkspace()
    }

    const fallbackCurrency = selectedAccount?.currency
    const dateLabel = formatPeriodLabel(periodRange, locale, t)

    if (activeView === 'RECURRING') {
        return (
            <div className="transactions-workspace">
                <WorkspaceSidebar
                    activePage="transactions"
                    activeAccounts={accounts.filter((account) => !account.closedAt).length}
                />
                <main className="transactions-main">
                    <RecurringTransactionsView
                        accounts={accounts}
                        categories={categories}
                        onHistory={() => setActiveView('HISTORY')}
                    />
                </main>
            </div>
        )
    }

    return (
        <div className="transactions-workspace">
            <WorkspaceSidebar
                activePage="transactions"
                activeAccounts={accounts.filter((account) => !account.closedAt).length}
            />

            <main className="transactions-main">
                <header className="transactions-page-header">
                    <div>
                        <h1>{t('transactions.title')}</h1>
                        <p>{t('transactions.subtitle')}</p>
                    </div>

                    <div className="transactions-header-actions">
                        <button
                            className="transaction-period-button"
                            type="button"
                            onClick={() => quickFiltersRef.current?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'center',
                            })}
                        >
                            <Icon name="calendar"/>
                            {dateLabel}
                        </button>
                        <button
                            ref={newTransferButtonRef}
                            className="new-transfer-button"
                            type="button"
                            onClick={(event) => openTransferForm(event.currentTarget)}
                        >
                            <Icon name="transfer"/>
                            {t('transactions.transfer')}
                        </button>
                        <button
                            ref={newTransactionButtonRef}
                            className="new-transaction-button"
                            type="button"
                            onClick={(event) =>
                                openForm(
                                    undefined,
                                    event.currentTarget,
                                )
                            }
                        >
                            <Icon name="plus"/>
                            {t('transactions.newTransaction')}
                        </button>
                    </div>
                </header>

                <div
                    className="transaction-view-tabs"
                    role="tablist"
                    aria-label={t('transactions.view')}
                >
                    <button
                        className="active"
                        type="button"
                        role="tab"
                        aria-selected="true"
                    >
                        {t('transactions.history')}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected="false"
                        onClick={() => setActiveView('RECURRING')}
                    >
                        <Icon name="repeat"/>
                        {t('transactions.recurring')}
                    </button>
                </div>

                {notice && (
                    <div
                        className={
                            notice.kind === 'error'
                                ? 'transactions-notice error'
                                : 'transactions-notice'
                        }
                        role={
                            notice.kind === 'error'
                                ? 'alert'
                                : 'status'
                        }
                    >
                        {notice.message}
                    </div>
                )}

                <MetricsSection metrics={metrics} locale={locale} fallbackCurrency={fallbackCurrency}/>

                <div className="transactions-content-grid">
                    <ActivitySection
                        locale={locale}
                        searchQuery={searchQuery}
                        updateFilters={updateFilters}
                        quickFiltersRef={quickFiltersRef}
                        dateLabel={dateLabel}
                        activityType={activityType}
                        loadState={loadState}
                        loadError={loadError}
                        reloadWorkspace={reloadWorkspace}
                        visibleTransactions={visibleTransactions}
                        transactionsCount={transactions.length}
                        groupedTransactions={groupedTransactions}
                        anchorDate={anchorDate}
                        accountMap={accountMap}
                        categoryMap={categoryMap}
                        transferMap={transferMap}
                        reversedTransferIds={reversedTransferIds}
                        openForm={openForm}
                        openDeleteDialog={openDeleteDialog}
                        openReverseTransfer={openReverseTransfer}
                    />

                    <aside className="transactions-side-column">
                        <SpendingSection
                            dateLabel={dateLabel}
                            spendingCurrency={spendingCurrency}
                            spendingCurrencyOptions={spendingCurrencyOptions}
                            defaultSpendingCurrency={defaultSpendingCurrency}
                            spendingByCategory={spendingByCategory}
                            locale={locale}
                            updateFilters={updateFilters}
                        />

                        <QuickFiltersSection
                            quickFiltersRef={quickFiltersRef}
                            period={period}
                            customPeriod={customPeriod}
                            lastCustomPeriod={lastCustomPeriod}
                            setLastCustomPeriod={setLastCustomPeriod}
                            customPeriodDraft={customPeriodDraft}
                            setCustomPeriodDraft={setCustomPeriodDraft}
                            canApplyCustomPeriod={canApplyCustomPeriod}
                            customPeriodIsReversed={customPeriodIsReversed}
                            accountFilter={accountFilter}
                            categoryFilter={categoryFilter}
                            accounts={accounts}
                            categories={categories}
                            canonicalFilters={canonicalFilters}
                            anchorDate={anchorDate}
                            updateFilters={updateFilters}
                        />

                        <section
                            className="recurring-transactions-card"
                        >
                            <span><Icon name="repeat"/></span>
                            <div>
                                <strong>{t('transactions.recurringView.title')}</strong>
                                <p>
                                    {t('transactions.inPeriod', {count: recurringCount})}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveView('RECURRING')}
                            >
                                {t('transactions.manage')}
                            </button>
                        </section>
                    </aside>
                </div>
            </main>

            {formState && (
                <TransactionFormModal
                    accounts={accounts}
                    categories={categories}
                    transaction={formState.transaction}
                    onClose={() => setFormState(null)}
                    onSaved={handleSaved}
                    restoreFocus={formState.restoreFocus}
                />
            )}

            {deleteState && (
                <DeleteTransactionDialog
                    transaction={deleteState.transaction}
                    onCancel={() => setDeleteState(null)}
                    onDeleted={handleDeleted}
                    restoreFocus={deleteState.restoreFocus}
                />
            )}

            {transferFormState && (
                <TransferFormModal
                    accounts={accounts}
                    onClose={() => setTransferFormState(null)}
                    onSaved={handleTransferSaved}
                    restoreFocus={transferFormState.restoreFocus}
                />
            )}

            {reverseTransferState && (
                <ReverseTransferDialog
                    accounts={accounts}
                    transfer={reverseTransferState.transfer}
                    onClose={() => setReverseTransferState(null)}
                    onReversed={handleTransferReversed}
                    restoreFocus={reverseTransferState.restoreFocus}
                />
            )}
        </div>
    )
}
