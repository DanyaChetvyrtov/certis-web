import {Select, SelectOption} from '../../../components/Select'
import {useRef} from 'react'
import {useTranslation} from 'react-i18next'
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
import {useLanguage} from '../../../i18n/useLanguage'

type UncategorizedTransactionsModalProps = {
    analytics: CategoryAnalytics
    currency: Currency
    month: string
    type: CategoryType
    onAssigned: () => Promise<void>
    onClose: () => void
    restoreFocus?: () => void
}

const formatPercentage = (value: number, locale: string): string =>
    new Intl.NumberFormat(locale, {
        maximumFractionDigits: 1,
    }).format(value)

const formatMoney = (
    amount: number,
    currency: Currency,
    type: CategoryType,
    locale: string,
): string => {
    const formatted = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(Math.abs(amount))

    return `${type === 'EXPENSE' ? '−' : '+'}${formatted}`
}

const formatMonth = (month: string, locale: string): string =>
    new Intl.DateTimeFormat(locale, {
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
    const {t} = useTranslation()
    const {locale} = useLanguage()
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
                            {t('categories.uncategorized.title')}
                        </h2>
                        <p>{t('categories.uncategorized.subtitle')}</p>
                    </div>
                    <button
                        type="button"
                        aria-label={t('categories.uncategorized.close')}
                        disabled={isAssigning}
                        onClick={onClose}
                    >
                        <Icon name="close"/>
                    </button>
                </header>

                <section className="uncategorized-summary">
                    <div>
                        <p>
                            {formatMonth(month, locale)} · {t(`categories.type.${type}`)} · {currency}
                        </p>
                        <strong>
                            {analytics.coveragePercentage === null
                                ? '—'
                                : `${formatPercentage(percentage, locale)}%`}
                            <span> {t('categories.uncategorized.categorizedValue')}</span>
                        </strong>
                    </div>
                    <div
                        className="uncategorized-summary-progress"
                        role="progressbar"
                        aria-label={t('categories.uncategorized.coverage')}
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
                                {t('categories.uncategorized.transactionCount', {count: itemCount})}
                            </strong>
                            <p>
                                {t('categories.uncategorized.remains', {
                                    amount: formatMoney(
                                        analytics.uncategorizedSum,
                                        currency,
                                        type,
                                        locale,
                                    ),
                                })}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="uncategorized-transactions">
                    <div className="uncategorized-transactions-heading">
                        <div>
                            <h3>{t('categories.uncategorized.transactions')}</h3>
                            <p>{t('categories.uncategorized.selectDescription')}</p>
                        </div>
                        <label className="uncategorized-search-field">
                            <Icon name="search"/>
                            <span className="sr-only">{t('categories.uncategorized.search')}</span>
                            <input
                                ref={searchInputRef}
                                value={searchQuery}
                                type="search"
                                maxLength={255}
                                placeholder={t('categories.uncategorized.search')}
                                onChange={(event) =>
                                    setSearchQuery(event.target.value)
                                }
                            />
                        </label>
                        <label className="uncategorized-account-field">
                            <span>{t('categories.uncategorized.account')}</span>
                            <Select
                                aria-label={t('categories.uncategorized.filterAccount')}
                                value={accountId}
                                disabled={optionState === 'loading'}
                                onValueChange={(value) =>
                                    changeAccount(value)
                                }
                            >
                                <SelectOption value="">{t('categories.uncategorized.allAccounts')}</SelectOption>
                                {visibleAccounts.map((account) => (
                                    <SelectOption value={account.id} key={account.id}>
                                        {account.name}
                                    </SelectOption>
                                ))}
                            </Select>
                        </label>
                    </div>

                    {optionState === 'error' && (
                        <div className="uncategorized-inline-error" role="alert">
                            <span>{optionError}</span>
                            <button type="button" onClick={() => void loadOptions()}>
                                {t('categories.tryAgain')}
                            </button>
                        </div>
                    )}

                    {optionState === 'ready'
                        && categoryOptions.length === 0
                        && (
                            <div className="uncategorized-options-empty" role="status">
                                {t('categories.uncategorized.optionsEmpty', {
                                    type: type === 'EXPENSE'
                                        ? t('categories.type.expenseLower')
                                        : t('categories.type.incomeLower'),
                                })}
                            </div>
                        )}

                    <div className="uncategorized-table-heading" aria-hidden="true">
                        <span>{t('categories.uncategorized.select')}</span>
                        <span>{t('categories.uncategorized.transaction')}</span>
                        <span>{t('categories.uncategorized.account')}</span>
                        <span>{t('categories.uncategorized.amount')}</span>
                        <span>{t('categories.uncategorized.category')}</span>
                    </div>

                    {transactionState === 'loading' && (
                        <div
                            className="uncategorized-loading"
                            aria-label={t('categories.uncategorized.loading')}
                        >
                            <span/>
                            <span/>
                        </div>
                    )}

                    {transactionState === 'error' && (
                        <div className="uncategorized-empty" role="alert">
                            <Icon name="alert"/>
                            <h3>{t('categories.uncategorized.loadTitle')}</h3>
                            <p>{transactionError}</p>
                            <button
                                type="button"
                                onClick={() => void loadTransactions()}
                            >
                                {t('categories.tryAgain')}
                            </button>
                        </div>
                    )}

                    {transactionState === 'ready'
                        && transactions?.items.length === 0
                        && (
                            <div className="uncategorized-empty">
                                <Icon name="check-circle"/>
                                <h3>{t('categories.uncategorized.nothingLeft')}</h3>
                                <p>
                                    {appliedSearch || accountId
                                        ? t('categories.uncategorized.noMatches')
                                        : t('categories.uncategorized.allTypeCategorized', {
                                            type: type === 'EXPENSE'
                                                ? t('categories.type.expenseLower')
                                                : t('categories.type.incomeLower'),
                                        })}
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
                            aria-label={t('categories.uncategorized.pages')}
                        >
                            <button
                                type="button"
                                disabled={page === 0 || transactionState === 'loading'}
                                onClick={goToPreviousPage}
                            >
                                {t('categories.uncategorized.previous')}
                            </button>
                            <span>
                                {t('categories.uncategorized.page', {
                                    page: transactions.page + 1,
                                    total: transactions.totalPages,
                                })}
                            </span>
                            <button
                                type="button"
                                disabled={
                                    page >= transactions.totalPages - 1
                                    || transactionState === 'loading'
                                }
                                onClick={goToNextPage}
                            >
                                {t('categories.uncategorized.next')}
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
                        {t('categories.uncategorized.cancel')}
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
                            ? t('categories.uncategorized.assigning')
                            : selectedCount > 0
                                ? t('categories.uncategorized.assignCount', {count: selectedCount})
                                : t('categories.uncategorized.assign')}
                    </button>
                </footer>
            </div>
        </div>
    )
}
