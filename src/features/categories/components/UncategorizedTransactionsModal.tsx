import {useRef} from 'react'
import {Icon} from '../../../components/Icons'
import type {Currency} from '../../../shared/currency'
import {
    useModalAccessibility,
} from '../../../shared/hooks/useModalAccessibility'
import type {
    CategoryAnalytics,
    CategoryType,
} from '../api/categoriesApi'
import {
    useUncategorizedTransactions,
} from '../hooks/useUncategorizedTransactions'
import {
    UncategorizedTransactionRow,
} from './UncategorizedTransactionRow'
import './UncategorizedTransactionsModal.css'

type UncategorizedTransactionsModalProps = {
    analytics: CategoryAnalytics
    currency: Currency
    month: string
    type: CategoryType
    onAssigned: () => Promise<void>
    onClose: () => void
    restoreFocus?: () => void
}

const formatPercentage = (value: number): string =>
    new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 1,
    }).format(value)

const formatMoney = (
    amount: number,
    currency: Currency,
    type: CategoryType,
): string => {
    const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(Math.abs(amount))

    return `${type === 'EXPENSE' ? '−' : '+'}${formatted}`
}

const formatMonth = (month: string): string =>
    new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(`${month}-01T00:00:00Z`))

export function UncategorizedTransactionsModal({
    analytics,
    currency,
    month,
    type,
    onAssigned,
    onClose,
    restoreFocus,
}: UncategorizedTransactionsModalProps) {
    const searchInputRef = useRef<HTMLInputElement>(null)
    const {
        accountId,
        appliedSearch,
        assignmentError,
        assignmentNotice,
        assignSelected,
        categoryByTransaction,
        categoryOptions,
        changeAccount,
        chooseCategory,
        goToNextPage,
        goToPreviousPage,
        hasIncompleteSelection,
        isAssigning,
        loadOptions,
        loadTransactions,
        optionError,
        optionState,
        page,
        searchQuery,
        selectedCount,
        selectedIds,
        setSearchQuery,
        transactionError,
        transactions,
        transactionState,
        toggleTransaction,
        visibleAccounts,
    } = useUncategorizedTransactions({
        currency,
        month,
        type,
        onAssigned,
    })

    const dialogRef =
        useModalAccessibility<HTMLDivElement>({
            canClose: !isAssigning,
            initialFocusRef: searchInputRef,
            onClose,
            restoreFocus,
        })

    const percentage = analytics.coveragePercentage ?? 0
    const itemCount = transactions?.totalElements
        ?? analytics.uncategorizedTransactionCount

    return (
        <div className="uncategorized-modal-layer" role="presentation">
            <div
                ref={dialogRef}
                className="uncategorized-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="uncategorized-modal-title"
                tabIndex={-1}
            >
                <header className="uncategorized-modal-heading">
                    <span><Icon name="tag"/></span>
                    <div>
                        <h2 id="uncategorized-modal-title">
                            Uncategorized transactions
                        </h2>
                        <p>Assign categories without leaving this page.</p>
                    </div>
                    <button
                        type="button"
                        aria-label="Close uncategorized transactions"
                        disabled={isAssigning}
                        onClick={onClose}
                    >
                        <Icon name="close"/>
                    </button>
                </header>

                <section className="uncategorized-summary">
                    <div>
                        <p>
                            {formatMonth(month)} · {type === 'EXPENSE' ? 'Expenses' : 'Income'} · {currency}
                        </p>
                        <strong>
                            {analytics.coveragePercentage === null
                                ? '—'
                                : `${formatPercentage(percentage)}%`}
                            <span> of transaction value categorized</span>
                        </strong>
                    </div>
                    <div
                        className="uncategorized-summary-progress"
                        role="progressbar"
                        aria-label="Category coverage"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percentage}
                    >
                        <span style={{width: `${percentage}%`}}/>
                    </div>
                    <div className="uncategorized-summary-remaining">
                        <span><Icon name="alert"/></span>
                        <div>
                            <strong>
                                {itemCount} {itemCount === 1 ? 'transaction' : 'transactions'}
                            </strong>
                            <p>
                                {formatMoney(
                                    analytics.uncategorizedSum,
                                    currency,
                                    type,
                                )} remains uncategorized
                            </p>
                        </div>
                    </div>
                </section>

                <section className="uncategorized-transactions">
                    <div className="uncategorized-transactions-heading">
                        <div>
                            <h3>Transactions</h3>
                            <p>Select one or more rows, then assign a category.</p>
                        </div>
                        <label className="uncategorized-search-field">
                            <Icon name="search"/>
                            <span className="sr-only">Search transactions</span>
                            <input
                                ref={searchInputRef}
                                value={searchQuery}
                                type="search"
                                maxLength={255}
                                placeholder="Search transactions"
                                onChange={(event) =>
                                    setSearchQuery(event.target.value)
                                }
                            />
                        </label>
                        <label className="uncategorized-account-field">
                            <span>Account</span>
                            <select
                                aria-label="Filter by account"
                                value={accountId}
                                disabled={optionState === 'loading'}
                                onChange={(event) =>
                                    changeAccount(event.target.value)
                                }
                            >
                                <option value="">All accounts</option>
                                {visibleAccounts.map((account) => (
                                    <option value={account.id} key={account.id}>
                                        {account.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {optionState === 'error' && (
                        <div className="uncategorized-inline-error" role="alert">
                            <span>{optionError}</span>
                            <button type="button" onClick={() => void loadOptions()}>
                                Try again
                            </button>
                        </div>
                    )}

                    {optionState === 'ready'
                        && categoryOptions.length === 0
                        && (
                            <div className="uncategorized-options-empty" role="status">
                                Create an active {type === 'EXPENSE' ? 'expense' : 'income'} category before assigning transactions.
                            </div>
                        )}

                    <div className="uncategorized-table-heading" aria-hidden="true">
                        <span>Select</span>
                        <span>Transaction</span>
                        <span>Account</span>
                        <span>Amount</span>
                        <span>Category</span>
                    </div>

                    {transactionState === 'loading' && (
                        <div
                            className="uncategorized-loading"
                            aria-label="Loading uncategorized transactions"
                        >
                            <span/>
                            <span/>
                        </div>
                    )}

                    {transactionState === 'error' && (
                        <div className="uncategorized-empty" role="alert">
                            <Icon name="alert"/>
                            <h3>Transactions could not be loaded</h3>
                            <p>{transactionError}</p>
                            <button
                                type="button"
                                onClick={() => void loadTransactions()}
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {transactionState === 'ready'
                        && transactions?.items.length === 0
                        && (
                            <div className="uncategorized-empty">
                                <Icon name="check-circle"/>
                                <h3>Nothing left to categorize</h3>
                                <p>
                                    {appliedSearch || accountId
                                        ? 'No uncategorized transactions match these filters.'
                                        : `All ${type === 'EXPENSE' ? 'expense' : 'income'} transactions are categorized.`}
                                </p>
                            </div>
                        )}

                    {transactionState === 'ready'
                        && transactions
                        && transactions.items.length > 0
                        && (
                            <div className="uncategorized-transaction-list">
                                {transactions.items.map((transaction) => (
                                    <UncategorizedTransactionRow
                                        categories={categoryOptions}
                                        categoryId={
                                            categoryByTransaction[transaction.id] ?? ''
                                        }
                                        currency={currency}
                                        isOptionReady={optionState === 'ready'}
                                        isSelected={selectedIds.has(transaction.id)}
                                        key={transaction.id}
                                        transaction={transaction}
                                        type={type}
                                        onCategoryChange={chooseCategory}
                                        onSelectionChange={toggleTransaction}
                                    />
                                ))}
                            </div>
                        )}

                    {transactions && transactions.totalPages > 1 && (
                        <nav
                            className="uncategorized-pagination"
                            aria-label="Uncategorized transaction pages"
                        >
                            <button
                                type="button"
                                disabled={page === 0 || transactionState === 'loading'}
                                onClick={goToPreviousPage}
                            >
                                Previous
                            </button>
                            <span>
                                Page {transactions.page + 1} of {transactions.totalPages}
                            </span>
                            <button
                                type="button"
                                disabled={
                                    page >= transactions.totalPages - 1
                                    || transactionState === 'loading'
                                }
                                onClick={goToNextPage}
                            >
                                Next
                            </button>
                        </nav>
                    )}
                </section>

                <footer className="uncategorized-modal-footer">
                    <div aria-live="polite">
                        {assignmentError && (
                            <p className="uncategorized-assignment-error" role="alert">
                                {assignmentError}
                            </p>
                        )}
                        {assignmentNotice && (
                            <p className="uncategorized-assignment-notice">
                                {assignmentNotice}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        className="uncategorized-cancel-button"
                        disabled={isAssigning}
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="uncategorized-assign-button"
                        disabled={
                            isAssigning
                            || selectedCount === 0
                            || hasIncompleteSelection
                        }
                        onClick={() => void assignSelected()}
                    >
                        {isAssigning
                            ? 'Assigning…'
                            : `Assign${selectedCount > 0 ? ` ${selectedCount}` : ''}`}
                    </button>
                </footer>
            </div>
        </div>
    )
}
