import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import type {
    CSSProperties,
} from 'react'
import {
    Icon,
} from '../../../components/Icons'
import type {
    IconName,
} from '../../../components/Icons'
import {
    WorkspaceSidebar,
} from '../../../layouts/WorkspaceSidebar'
import {ApiError} from '../../../shared/api/ApiError'
import {
    getAccounts,
} from '../../accounts/api/accountsApi'
import type {
    Account,
    Currency,
} from '../../accounts/api/accountsApi'
import {
    getCategories,
    isCategoryIcon,
} from '../../categories/api/categoriesApi'
import type {
    Category,
} from '../../categories/api/categoriesApi'
import {
    getAllTransactions,
} from '../api/transactionsApi'
import type {
    Transaction,
    TransactionType,
} from '../api/transactionsApi'
import {
    DeleteTransactionDialog,
} from '../components/DeleteTransactionDialog'
import {
    TransactionActionMenu,
} from '../components/TransactionActionMenu'
import {
    TransactionFormModal,
} from '../components/TransactionFormModal'
import './TransactionsPage.css'

type LoadState = 'loading' | 'ready' | 'error'
type ActivityType = 'ALL' | TransactionType
type PeriodPreset = 'THIS_MONTH' | 'LAST_30_DAYS' | 'ALL_TIME'

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

type PeriodRange = {
    from?: string
    to?: string
    start?: Date
    end?: Date
}

type TransactionAccentStyle = CSSProperties & {
    '--transaction-accent': string
}

type CategorySpending = {
    id: string
    name: string
    color: string
    amount: number
}

const currencySymbols: Record<Currency, string> = {
    RUB: '₽',
    EUR: '€',
    USD: '$',
}

const periodLabels: Record<PeriodPreset, string> = {
    THIS_MONTH: 'This month',
    LAST_30_DAYS: 'Last 30 days',
    ALL_TIME: 'All time',
}

const startOfLocalDay = (
    date: Date,
): Date =>
    new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
    )

const endOfLocalDay = (
    date: Date,
): Date =>
    new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        59,
        999,
    )

const getPeriodRange = (
    period: PeriodPreset,
    anchorDate: Date,
): PeriodRange => {
    if (period === 'ALL_TIME') {
        return {}
    }

    const end = endOfLocalDay(anchorDate)
    const start = period === 'THIS_MONTH'
        ? new Date(
            anchorDate.getFullYear(),
            anchorDate.getMonth(),
            1,
        )
        : startOfLocalDay(new Date(
            anchorDate.getFullYear(),
            anchorDate.getMonth(),
            anchorDate.getDate() - 29,
        ))

    return {
        from: start.toISOString(),
        to: end.toISOString(),
        start,
        end,
    }
}

const formatPeriodLabel = (
    range: PeriodRange,
): string => {
    if (!range.start || !range.end) {
        return 'All time'
    }

    const sameMonth =
        range.start.getFullYear() === range.end.getFullYear()
        && range.start.getMonth() === range.end.getMonth()

    if (sameMonth) {
        return `${range.start.toLocaleDateString('en-US', {
            month: 'short',
        })} ${range.start.getDate()}–${range.end.getDate()}, ${range.end.getFullYear()}`
    }

    return `${range.start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    })} – ${range.end.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })}`
}

const formatMoney = (
    amount: number,
    currency: Currency,
    showPositiveSign = false,
): string => {
    const absoluteAmount = Math.abs(amount)
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(absoluteAmount)
    const sign = amount < 0
        ? '−'
        : showPositiveSign && amount > 0
            ? '+'
            : ''

    return `${sign}${currencySymbols[currency]}${formatted}`
}

const formatMoneyMap = (
    amounts: Map<Currency, number>,
    fallbackCurrency?: Currency,
    showPositiveSign = false,
): string => {
    if (amounts.size === 0) {
        return fallbackCurrency
            ? formatMoney(0, fallbackCurrency)
            : '—'
    }

    return Array.from(amounts.entries())
        .sort(([first], [second]) =>
            first.localeCompare(second),
        )
        .map(([currency, amount]) =>
            formatMoney(
                amount,
                currency,
                showPositiveSign,
            ),
        )
        .join(' · ')
}

const groupDateKey = (
    dateValue: string,
): string => {
    const date = new Date(dateValue)

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-')
}

const isSameDay = (
    first: Date,
    second: Date,
): boolean =>
    first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate()

const formatGroupHeading = (
    dateValue: string,
    today: Date,
): string => {
    const date = new Date(dateValue)
    const yesterday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 1,
    )
    const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    })

    if (isSameDay(date, today)) {
        return `Today · ${formattedDate}`
    }

    if (isSameDay(date, yesterday)) {
        return `Yesterday · ${formattedDate}`
    }

    return formattedDate
}

const loadErrorMessage = (
    error: unknown,
): string =>
    error instanceof ApiError
        ? error.message
        : 'We could not load your transaction workspace. Please try again.'

const transactionTitle = (
    transaction: Transaction,
): string =>
    transaction.merchant?.trim()
    || (transaction.type === 'INCOME'
        ? 'Income transaction'
        : 'Expense transaction')

const accentStyle = (
    color: string,
): TransactionAccentStyle => ({
    '--transaction-accent': color,
})

const addAmount = (
    map: Map<Currency, number>,
    currency: Currency,
    amount: number,
): void => {
    map.set(currency, (map.get(currency) ?? 0) + amount)
}

export function TransactionsPage() {
    const [transactions, setTransactions] =
        useState<Transaction[]>([])
    const [accounts, setAccounts] = useState<Account[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [resourceState, setResourceState] =
        useState<LoadState>('loading')
    const [transactionState, setTransactionState] =
        useState<LoadState>('loading')
    const [loadError, setLoadError] = useState('')
    const [reloadRevision, setReloadRevision] = useState(0)
    const [period, setPeriod] =
        useState<PeriodPreset>('THIS_MONTH')
    const [accountFilter, setAccountFilter] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [activityType, setActivityType] =
        useState<ActivityType>('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [recurringOnly, setRecurringOnly] = useState(false)
    const [formState, setFormState] =
        useState<FormState | null>(null)
    const [deleteState, setDeleteState] =
        useState<DeleteState | null>(null)
    const [notice, setNotice] = useState<Notice | null>(null)
    const [anchorDate] = useState(() => new Date())
    const newTransactionButtonRef = useRef<HTMLButtonElement>(null)
    const quickFiltersRef = useRef<HTMLElement>(null)

    const periodRange = useMemo(
        () => getPeriodRange(period, anchorDate),
        [anchorDate, period],
    )

    useEffect(() => {
        let isActive = true

        void Promise.all([
            getAccounts(),
            getCategories(),
        ]).then(
            ([loadedAccounts, loadedCategories]) => {
                if (!isActive) {
                    return
                }

                setAccounts(loadedAccounts)
                setCategories(loadedCategories)
                setResourceState('ready')
            },
            (error: unknown) => {
                if (!isActive) {
                    return
                }

                setLoadError(loadErrorMessage(error))
                setResourceState('error')
            },
        )

        return () => {
            isActive = false
        }
    }, [reloadRevision])

    useEffect(() => {
        let isActive = true

        void getAllTransactions({
            accountId: accountFilter || undefined,
            categoryId: categoryFilter || undefined,
            from: periodRange.from,
            to: periodRange.to,
        }).then(
            (loadedTransactions) => {
                if (!isActive) {
                    return
                }

                setTransactions(loadedTransactions)
                setTransactionState('ready')
            },
            (error: unknown) => {
                if (!isActive) {
                    return
                }

                setLoadError(loadErrorMessage(error))
                setTransactionState('error')
            },
        )

        return () => {
            isActive = false
        }
    }, [
        accountFilter,
        categoryFilter,
        periodRange.from,
        periodRange.to,
        reloadRevision,
    ])

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

    const selectedAccount = accountFilter
        ? accountMap.get(accountFilter)
        : undefined

    const metrics = useMemo(() => {
        const income = new Map<Currency, number>()
        const expenses = new Map<Currency, number>()
        const expenseCounts = new Map<Currency, number>()

        transactions.forEach((transaction) => {
            const account = accountMap.get(transaction.accountId)

            if (!account) {
                return
            }

            if (transaction.type === 'INCOME') {
                addAmount(
                    income,
                    account.currency,
                    transaction.amount,
                )
                return
            }

            addAmount(
                expenses,
                account.currency,
                transaction.amount,
            )
            expenseCounts.set(
                account.currency,
                (expenseCounts.get(account.currency) ?? 0) + 1,
            )
        })

        const cashFlow = new Map<Currency, number>()
        const averageSpend = new Map<Currency, number>()
        const currencies = new Set([
            ...income.keys(),
            ...expenses.keys(),
        ])

        currencies.forEach((currency) => {
            cashFlow.set(
                currency,
                (income.get(currency) ?? 0)
                - (expenses.get(currency) ?? 0),
            )
        })

        expenses.forEach((amount, currency) => {
            averageSpend.set(
                currency,
                amount / (expenseCounts.get(currency) ?? 1),
            )
        })

        return {
            income,
            expenses,
            cashFlow,
            averageSpend,
            incomeCount: transactions.filter(
                (transaction) => transaction.type === 'INCOME',
            ).length,
            expenseCount: transactions.filter(
                (transaction) => transaction.type === 'EXPENSE',
            ).length,
        }
    }, [accountMap, transactions])

    const spendingByCategory = useMemo(() => {
        const expenseCurrencies = new Set<Currency>()
        const grouped = new Map<string, CategorySpending>()

        transactions.forEach((transaction) => {
            if (transaction.type !== 'EXPENSE') {
                return
            }

            const account = accountMap.get(transaction.accountId)

            if (!account) {
                return
            }

            expenseCurrencies.add(account.currency)

            const category = transaction.categoryId
                ? categoryMap.get(transaction.categoryId)
                : undefined
            const id = category?.id ?? 'uncategorized'
            const current = grouped.get(id)

            grouped.set(id, {
                id,
                name: category?.name ?? 'Uncategorized',
                color: category?.color ?? '#8c9ab8',
                amount: (current?.amount ?? 0) + transaction.amount,
            })
        })

        if (expenseCurrencies.size !== 1) {
            return {
                currency: undefined,
                items: [],
                total: 0,
                mixedCurrencies: expenseCurrencies.size > 1,
            }
        }

        const currency = Array.from(expenseCurrencies)[0]
        const sorted = Array.from(grouped.values())
            .sort((first, second) => second.amount - first.amount)
        const items = sorted.length > 5
            ? [
                ...sorted.slice(0, 4),
                {
                    id: 'other',
                    name: 'Other',
                    color: '#7584a5',
                    amount: sorted.slice(4).reduce(
                        (total, item) => total + item.amount,
                        0,
                    ),
                },
            ]
            : sorted

        return {
            currency,
            items,
            total: sorted.reduce(
                (total, item) => total + item.amount,
                0,
            ),
            mixedCurrencies: false,
        }
    }, [accountMap, categoryMap, transactions])

    const recurringCount = transactions.filter(
        (transaction) => Boolean(transaction.recurringTransactionTemplateId),
    ).length

    const visibleTransactions = useMemo(() => {
        const normalizedQuery =
            searchQuery.trim().toLocaleLowerCase()

        return transactions
            .filter((transaction) =>
                activityType === 'ALL'
                || transaction.type === activityType,
            )
            .filter((transaction) =>
                !recurringOnly
                || Boolean(transaction.recurringTransactionTemplateId),
            )
            .filter((transaction) => {
                if (!normalizedQuery) {
                    return true
                }

                const account = accountMap.get(transaction.accountId)
                const category = transaction.categoryId
                    ? categoryMap.get(transaction.categoryId)
                    : undefined

                return [
                    transaction.merchant,
                    transaction.note,
                    account?.name,
                    category?.name,
                ].some((value) =>
                    value
                        ?.toLocaleLowerCase()
                        .includes(normalizedQuery),
                )
            })
            .sort((first, second) =>
                new Date(second.occurredAt).getTime()
                - new Date(first.occurredAt).getTime(),
            )
    }, [
        accountMap,
        activityType,
        categoryMap,
        recurringOnly,
        searchQuery,
        transactions,
    ])

    const groupedTransactions = useMemo(() => {
        const groups = new Map<string, Transaction[]>()

        visibleTransactions.forEach((transaction) => {
            const key = groupDateKey(transaction.occurredAt)
            const group = groups.get(key) ?? []

            group.push(transaction)
            groups.set(key, group)
        })

        return Array.from(groups.values())
    }, [visibleTransactions])

    const matchesCurrentFilters = (
        transaction: Transaction,
    ): boolean => {
        if (
            accountFilter
            && transaction.accountId !== accountFilter
        ) {
            return false
        }

        if (
            categoryFilter
            && transaction.categoryId !== categoryFilter
        ) {
            return false
        }

        const transactionDate = new Date(transaction.occurredAt).getTime()

        return (
            !periodRange.from
            || transactionDate >= new Date(periodRange.from).getTime()
        ) && (
            !periodRange.to
            || transactionDate <= new Date(periodRange.to).getTime()
        )
    }

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
                ? 'Transaction updated.'
                : matchesCurrentFilters(savedTransaction)
                    ? 'Transaction added.'
                    : 'Transaction added outside the current filters.',
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
            message: 'Transaction deleted.',
        })
    }

    const loadState: LoadState =
        resourceState === 'error'
        || transactionState === 'error'
            ? 'error'
            : resourceState === 'loading'
            || transactionState === 'loading'
                ? 'loading'
                : 'ready'

    const fallbackCurrency = selectedAccount?.currency
    const dateLabel = formatPeriodLabel(periodRange)

    return (
        <div className="transactions-workspace">
            <WorkspaceSidebar activePage="transactions"/>

            <main className="transactions-main">
                <header className="transactions-page-header">
                    <div>
                        <h1>Transactions</h1>
                        <p>
                            Track every movement of money across your accounts.
                        </p>
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
                            New transaction
                        </button>
                    </div>
                </header>

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

                <section
                    className="transaction-metrics"
                    aria-label="Transaction summary"
                >
                    <article>
                        <span className="metric-icon income">
                            <Icon name="cash"/>
                        </span>
                        <div>
                            <p>Income</p>
                            <strong>
                                {formatMoneyMap(
                                    metrics.income,
                                    fallbackCurrency,
                                )}
                            </strong>
                            <small className="income">
                                {metrics.incomeCount} {metrics.incomeCount === 1
                                    ? 'transaction'
                                    : 'transactions'}
                            </small>
                        </div>
                    </article>

                    <article>
                        <span className="metric-icon expense">
                            <Icon name="wallet"/>
                        </span>
                        <div>
                            <p>Expenses</p>
                            <strong>
                                {formatMoneyMap(
                                    metrics.expenses,
                                    fallbackCurrency,
                                )}
                            </strong>
                            <small className="expense">
                                {metrics.expenseCount} {metrics.expenseCount === 1
                                    ? 'transaction'
                                    : 'transactions'}
                            </small>
                        </div>
                    </article>

                    <article>
                        <span className="metric-icon income">
                            <Icon name="repeat"/>
                        </span>
                        <div>
                            <p>Net cash flow</p>
                            <strong>
                                {formatMoneyMap(
                                    metrics.cashFlow,
                                    fallbackCurrency,
                                    true,
                                )}
                            </strong>
                            <small>
                                Across the selected period
                            </small>
                        </div>
                    </article>

                    <article>
                        <span className="metric-icon average">
                            <Icon name="gauge"/>
                        </span>
                        <div>
                            <p>Average spend</p>
                            <strong>
                                {formatMoneyMap(
                                    metrics.averageSpend,
                                    fallbackCurrency,
                                )}
                            </strong>
                            <small className="average">
                                Per expense
                            </small>
                        </div>
                    </article>
                </section>

                <div className="transactions-content-grid">
                    <section className="transaction-activity-card">
                        <header className="transaction-activity-heading">
                            <div>
                                <h2>Activity</h2>
                                <p>Your latest income and expenses</p>
                            </div>

                            <div className="transaction-activity-tools">
                                <label className="transaction-search-field">
                                    <Icon name="search"/>
                                    <span className="sr-only">
                                        Search transactions
                                    </span>
                                    <input
                                        type="search"
                                        value={searchQuery}
                                        placeholder="Search transactions"
                                        onChange={(event) =>
                                            setSearchQuery(event.target.value)
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
                                    Filters
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
                                aria-label="Transaction type"
                            >
                                {(['ALL', 'INCOME', 'EXPENSE'] as const)
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
                                            onClick={() => setActivityType(type)}
                                        >
                                            {type === 'ALL'
                                                ? 'All'
                                                : type === 'INCOME'
                                                    ? 'Income'
                                                    : 'Expense'}
                                        </button>
                                    ))}
                            </div>

                            <div className="transaction-column-headings">
                                <span>Category</span>
                                <span>Account</span>
                                <span>Time</span>
                                <span>Amount</span>
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
                                    aria-label="Loading transactions"
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
                                    <h3>Transactions could not be loaded</h3>
                                    <p>{loadError}</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setResourceState('loading')
                                            setTransactionState('loading')
                                            setLoadError('')
                                            setReloadRevision(
                                                (current) => current + 1,
                                            )
                                        }}
                                    >
                                        Try again
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
                                                    transactions.length === 0
                                                        ? 'receipt'
                                                        : 'search'
                                                }
                                            />
                                        </span>
                                        <h3>
                                            {transactions.length === 0
                                                ? 'No transactions yet'
                                                : 'No transactions found'}
                                        </h3>
                                        <p>
                                            {transactions.length === 0
                                                ? 'Record your first income or expense to start building your activity.'
                                                : 'Try changing the activity type, search, or quick filters.'}
                                        </p>
                                        {transactions.length === 0 && (
                                            <button
                                                type="button"
                                                onClick={(event) =>
                                                    openForm(
                                                        undefined,
                                                        event.currentTarget,
                                                    )
                                                }
                                            >
                                                Add transaction
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
                                            const icon: IconName = category
                                                && isCategoryIcon(category.icon)
                                                ? category.icon
                                                : transaction.type === 'INCOME'
                                                    ? 'cash'
                                                    : 'receipt'
                                            const accent = category?.color
                                                ?? (transaction.type === 'INCOME'
                                                    ? '#10b981'
                                                    : '#df655e')

                                            return (
                                                <article
                                                    className="transaction-row"
                                                    key={transaction.id}
                                                    style={accentStyle(accent)}
                                                >
                                                    <div className="transaction-identity">
                                                        <span>
                                                            <Icon name={icon}/>
                                                        </span>
                                                        <div>
                                                            <strong>
                                                                {transactionTitle(transaction)}
                                                            </strong>
                                                            <small>
                                                                {transaction.note?.trim()
                                                                    || (transaction.recurringTransactionTemplateId
                                                                        ? 'Recurring transaction'
                                                                        : transaction.type === 'INCOME'
                                                                            ? 'Recorded income'
                                                                            : 'Recorded expense')}
                                                            </small>
                                                            <em>
                                                                {category?.name ?? 'Uncategorized'} · {account?.name ?? 'Unknown account'}
                                                            </em>
                                                        </div>
                                                    </div>

                                                    <div className="transaction-details">
                                                        <span className="transaction-category-cell">
                                                            {category?.name ?? 'Uncategorized'}
                                                        </span>

                                                        <span className="transaction-account-cell">
                                                            {account?.name ?? 'Unknown account'}
                                                        </span>

                                                        <time dateTime={transaction.occurredAt}>
                                                            {new Date(transaction.occurredAt)
                                                                .toLocaleTimeString(
                                                                    'en-US',
                                                                    {
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                        hour12: false,
                                                                    },
                                                                )}
                                                        </time>

                                                        <strong
                                                            className={
                                                                transaction.type === 'INCOME'
                                                                    ? 'transaction-amount income'
                                                                    : 'transaction-amount expense'
                                                            }
                                                        >
                                                            {account
                                                                ? formatMoney(
                                                                    transaction.type === 'INCOME'
                                                                        ? transaction.amount
                                                                        : -transaction.amount,
                                                                    account.currency,
                                                                    transaction.type === 'INCOME',
                                                                )
                                                                : transaction.amount}
                                                        </strong>

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
                                                    </div>
                                                </article>
                                            )
                                        })}
                                    </section>
                                ))}
                        </div>
                    </section>

                    <aside className="transactions-side-column">
                        <section className="spending-category-card">
                            <header>
                                <div>
                                    <h2>Spending by category</h2>
                                    <p>{dateLabel}</p>
                                </div>
                                {spendingByCategory.currency && (
                                    <strong>
                                        {formatMoney(
                                            spendingByCategory.total,
                                            spendingByCategory.currency,
                                        )}
                                    </strong>
                                )}
                            </header>

                            {spendingByCategory.mixedCurrencies && (
                                <div className="spending-category-message">
                                    <Icon name="alert"/>
                                    <p>
                                        Select one account to compare categories without mixing currencies.
                                    </p>
                                </div>
                            )}

                            {!spendingByCategory.mixedCurrencies
                                && spendingByCategory.items.length === 0
                                && (
                                    <div className="spending-category-message">
                                        <Icon name="categories"/>
                                        <p>
                                            Expense categories will appear here.
                                        </p>
                                    </div>
                                )}

                            {spendingByCategory.items.length > 0 && (
                                <div className="spending-category-list">
                                    {spendingByCategory.items.map((item) => {
                                        const percentage = spendingByCategory.total
                                            ? Math.round(
                                                item.amount
                                                / spendingByCategory.total
                                                * 100,
                                            )
                                            : 0

                                        return (
                                            <div key={item.id}>
                                                <p>
                                                    <span>{item.name}</span>
                                                    <strong>
                                                        {formatMoney(
                                                            item.amount,
                                                            spendingByCategory.currency!,
                                                        )} · {percentage}%
                                                    </strong>
                                                </p>
                                                <span className="spending-progress">
                                                    <i
                                                        style={{
                                                            width: `${percentage}%`,
                                                            backgroundColor: item.color,
                                                        }}
                                                    />
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </section>

                        <section
                            ref={quickFiltersRef}
                            className="transaction-quick-filters"
                        >
                            <header>
                                <h2>Quick filters</h2>
                                <p>Narrow the activity list</p>
                            </header>

                            <label htmlFor="transaction-period-filter">
                                Period
                            </label>
                            <div className="quick-filter-select wide">
                                <Icon name="calendar"/>
                                <select
                                    id="transaction-period-filter"
                                    value={period}
                                    onChange={(event) =>
                                        setPeriod(
                                            event.target.value as PeriodPreset,
                                        )
                                    }
                                >
                                    {Object.entries(periodLabels)
                                        .map(([value, label]) => (
                                            <option value={value} key={value}>
                                                {label}
                                            </option>
                                        ))}
                                </select>
                                <Icon name="chevron-down"/>
                            </div>

                            <label htmlFor="transaction-account-filter">
                                Account
                            </label>
                            <div className="quick-filter-grid">
                                <div className="quick-filter-select">
                                    <Icon name="card"/>
                                    <select
                                        id="transaction-account-filter"
                                        value={accountFilter}
                                        onChange={(event) =>
                                            setAccountFilter(event.target.value)
                                        }
                                    >
                                        <option value="">All accounts</option>
                                        {accounts.map((account) => (
                                            <option
                                                value={account.id}
                                                key={account.id}
                                            >
                                                {account.name} · {account.currency}
                                            </option>
                                        ))}
                                    </select>
                                    <Icon name="chevron-down"/>
                                </div>

                                <div className="quick-filter-select">
                                    <Icon name="tag"/>
                                    <select
                                        aria-label="Category filter"
                                        value={categoryFilter}
                                        onChange={(event) =>
                                            setCategoryFilter(event.target.value)
                                        }
                                    >
                                        <option value="">All categories</option>
                                        {categories.map((category) => (
                                            <option
                                                value={category.id}
                                                key={category.id}
                                            >
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                    <Icon name="chevron-down"/>
                                </div>
                            </div>

                            {(accountFilter || categoryFilter || period !== 'THIS_MONTH')
                                && (
                                    <button
                                        className="clear-transaction-filters"
                                        type="button"
                                        onClick={() => {
                                            setAccountFilter('')
                                            setCategoryFilter('')
                                            setPeriod('THIS_MONTH')
                                        }}
                                    >
                                        Clear quick filters
                                    </button>
                                )}
                        </section>

                        <section
                            className={
                                recurringOnly
                                    ? 'recurring-transactions-card active'
                                    : 'recurring-transactions-card'
                            }
                        >
                            <span><Icon name="repeat"/></span>
                            <div>
                                <strong>Recurring transactions</strong>
                                <p>
                                    {recurringCount} in this period
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={recurringCount === 0}
                                onClick={() => setRecurringOnly(
                                    (current) => !current,
                                )}
                            >
                                {recurringOnly ? 'Show all' : 'View'}
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
        </div>
    )
}
