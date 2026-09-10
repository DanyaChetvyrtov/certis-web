import {Select, SelectOption} from '../../../components/Select'
import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import type {
    CSSProperties,
} from 'react'
import {useTranslation} from 'react-i18next'
import type {TFunction} from 'i18next'
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
import {useSession} from '../../auth/session/SessionContext'
import {
    getAllCategoryCards,
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
    getTransfers,
} from '../api/transfersApi'
import type {
    Transfer,
} from '../api/transfersApi'
import {
    DeleteTransactionDialog,
} from '../components/DeleteTransactionDialog'
import {
    TransactionActionMenu,
} from '../components/TransactionActionMenu'
import {
    TransactionFormModal,
} from '../components/TransactionFormModal'
import {
    RecurringTransactionsView,
} from '../components/RecurringTransactionsView'
import {
    ReverseTransferDialog,
} from '../components/ReverseTransferDialog'
import {
    TransferActionMenu,
} from '../components/TransferActionMenu'
import {
    TransferFormModal,
} from '../components/TransferFormModal'
import {useLanguage} from '../../../i18n/useLanguage'
import './TransactionsPage.css'

type LoadState = 'loading' | 'ready' | 'error'
type ActivityType = 'ALL' | TransactionType | 'TRANSFER'
type PeriodPreset =
    | 'THIS_MONTH'
    | 'LAST_30_DAYS'
    | 'CUSTOM'
    | 'ALL_TIME'

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

type PeriodRange = {
    from?: string
    to?: string
    start?: Date
    end?: Date
}

type CustomPeriod = {
    from: string
    to: string
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

const currencyOrder: Currency[] = ['RUB', 'EUR', 'USD']

const periodPresets: PeriodPreset[] = [
    'THIS_MONTH',
    'LAST_30_DAYS',
    'CUSTOM',
    'ALL_TIME',
]

const toYearMonth = (date: Date): string => {
    const month = String(date.getMonth() + 1).padStart(2, '0')

    return `${date.getFullYear()}-${month}`
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

const toDateInputValue = (
    date: Date,
): string => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
].join('-')

const parseLocalDate = (
    value: string,
): Date | undefined => {
    const parts = value
        .split('-')
        .map(Number)

    if (
        parts.length !== 3
        || parts.some((part) => !Number.isInteger(part))
    ) {
        return undefined
    }

    const [year, month, day] = parts
    const date = new Date(year, month - 1, day)

    return date.getFullYear() === year
        && date.getMonth() === month - 1
        && date.getDate() === day
        ? date
        : undefined
}

const getDefaultCustomPeriod = (
    anchorDate: Date,
): CustomPeriod => ({
    from: toDateInputValue(new Date(
        anchorDate.getFullYear(),
        anchorDate.getMonth(),
        1,
    )),
    to: toDateInputValue(anchorDate),
})

const getPeriodRange = (
    period: PeriodPreset,
    anchorDate: Date,
    customPeriod: CustomPeriod,
): PeriodRange => {
    if (period === 'ALL_TIME') {
        return {}
    }

    if (period === 'CUSTOM') {
        const start = parseLocalDate(customPeriod.from)
        const endDate = parseLocalDate(customPeriod.to)

        if (!start || !endDate || start > endDate) {
            return {}
        }

        const end = endOfLocalDay(endDate)

        return {
            from: start.toISOString(),
            to: end.toISOString(),
            start,
            end,
        }
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
    locale: string,
    t: TFunction,
): string => {
    if (!range.start || !range.end) {
        return t('transactions.periods.ALL_TIME')
    }

    const sameMonth =
        range.start.getFullYear() === range.end.getFullYear()
        && range.start.getMonth() === range.end.getMonth()

    if (sameMonth) {
        return `${range.start.toLocaleDateString(locale, {
            month: 'short',
        })} ${range.start.getDate()}–${range.end.getDate()}, ${range.end.getFullYear()}`
    }

    return `${range.start.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
    })} – ${range.end.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })}`
}

const formatMoney = (
    amount: number,
    currency: Currency,
    locale: string,
    showPositiveSign = false,
): string => {
    const absoluteAmount = Math.abs(amount)
    const formatted = new Intl.NumberFormat(locale, {
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
    locale: string,
    fallbackCurrency?: Currency,
    showPositiveSign = false,
): string => {
    if (amounts.size === 0) {
        return fallbackCurrency
            ? formatMoney(0, fallbackCurrency, locale)
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
                locale,
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
    locale: string,
    t: TFunction,
): string => {
    const date = new Date(dateValue)
    const yesterday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 1,
    )
    const formattedDate = date.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
    })

    if (isSameDay(date, today)) {
        return t('transactions.today', {date: formattedDate})
    }

    if (isSameDay(date, yesterday)) {
        return t('transactions.yesterday', {date: formattedDate})
    }

    return formattedDate
}

const loadErrorMessage = (
    error: unknown,
    fallback: string,
): string =>
    error instanceof ApiError
        ? error.message
        : fallback

const transactionTitle = (
    transaction: Transaction,
    t: TFunction,
): string =>
    transaction.merchant?.trim()
    || (transaction.type === 'INCOME'
        ? t('transactions.incomeTransaction')
        : t('transactions.expenseTransaction'))

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
    const {t} = useTranslation()
    const {locale} = useLanguage()
    const {profile} = useSession()
    const preferredCurrency = profile?.preferredCurrency ?? 'RUB'
    const [transactions, setTransactions] =
        useState<Transaction[]>([])
    const [transfers, setTransfers] = useState<Transfer[]>([])
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
    const [requestedSpendingCurrency, setRequestedSpendingCurrency] =
        useState<Currency>(preferredCurrency)
    const [activityType, setActivityType] =
        useState<ActivityType>('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    const [activeView, setActiveView] =
        useState<'HISTORY' | 'RECURRING'>('HISTORY')
    const [formState, setFormState] =
        useState<FormState | null>(null)
    const [deleteState, setDeleteState] =
        useState<DeleteState | null>(null)
    const [transferFormState, setTransferFormState] =
        useState<TransferFormState | null>(null)
    const [reverseTransferState, setReverseTransferState] =
        useState<ReverseTransferState | null>(null)
    const [notice, setNotice] = useState<Notice | null>(null)
    const [anchorDate] = useState(() => new Date())
    const [customPeriod, setCustomPeriod] =
        useState<CustomPeriod>(() =>
            getDefaultCustomPeriod(anchorDate),
        )
    const [customPeriodDraft, setCustomPeriodDraft] =
        useState<CustomPeriod>(() =>
            getDefaultCustomPeriod(anchorDate),
        )
    const newTransactionButtonRef = useRef<HTMLButtonElement>(null)
    const newTransferButtonRef = useRef<HTMLButtonElement>(null)
    const quickFiltersRef = useRef<HTMLElement>(null)

    const periodRange = useMemo(
        () => getPeriodRange(
            period,
            anchorDate,
            customPeriod,
        ),
        [
            anchorDate,
            customPeriod,
            period,
        ],
    )

    const customPeriodStart =
        parseLocalDate(customPeriodDraft.from)
    const customPeriodEnd =
        parseLocalDate(customPeriodDraft.to)
    const customPeriodIsReversed = Boolean(
        customPeriodStart
        && customPeriodEnd
        && customPeriodStart > customPeriodEnd,
    )
    const canApplyCustomPeriod = Boolean(
        customPeriodStart
        && customPeriodEnd
        && !customPeriodIsReversed
        && (
            customPeriod.from !== customPeriodDraft.from
            || customPeriod.to !== customPeriodDraft.to
        ),
    )

    useEffect(() => {
        let isActive = true

        void Promise.all([
            getAccounts(),
            getAllCategoryCards({
                month: toYearMonth(anchorDate),
                currency: preferredCurrency,
                sort: 'NAME',
            }),
            getTransfers(),
        ]).then(
            ([loadedAccounts, loadedCategories, loadedTransfers]) => {
                if (!isActive) {
                    return
                }

                setAccounts(loadedAccounts)
                setCategories(loadedCategories)
                setTransfers(loadedTransfers)
                setResourceState('ready')
            },
            (error: unknown) => {
                if (!isActive) {
                    return
                }

                setLoadError(loadErrorMessage(error, t('transactions.loadError')))
                setResourceState('error')
            },
        )

        return () => {
            isActive = false
        }
    }, [anchorDate, preferredCurrency, reloadRevision, t])

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

                setLoadError(loadErrorMessage(error, t('transactions.loadError')))
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
        t,
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

    const spendingCurrencyOptions = useMemo(() => {
        if (selectedAccount) {
            return [selectedAccount.currency]
        }

        const currencies = new Set<Currency>()

        transactions.forEach((transaction) => {
            if (transaction.transferId || transaction.type !== 'EXPENSE') {
                return
            }

            const account = accountMap.get(transaction.accountId)

            if (account) {
                currencies.add(account.currency)
            }
        })

        const available = currencyOrder.filter((currency) => currencies.has(currency))

        return available.length > 0 ? available : [preferredCurrency]
    }, [accountMap, preferredCurrency, selectedAccount, transactions])

    const spendingCurrency = spendingCurrencyOptions.includes(requestedSpendingCurrency)
        ? requestedSpendingCurrency
        : spendingCurrencyOptions.includes(preferredCurrency)
            ? preferredCurrency
            : spendingCurrencyOptions[0]

    const metrics = useMemo(() => {
        const income = new Map<Currency, number>()
        const expenses = new Map<Currency, number>()
        const expenseCounts = new Map<Currency, number>()

        transactions.forEach((transaction) => {
            if (transaction.transferId) {
                return
            }

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
                (transaction) =>
                    !transaction.transferId
                    && transaction.type === 'INCOME',
            ).length,
            expenseCount: transactions.filter(
                (transaction) =>
                    !transaction.transferId
                    && transaction.type === 'EXPENSE',
            ).length,
        }
    }, [accountMap, transactions])

    const spendingByCategory = useMemo(() => {
        const grouped = new Map<string, CategorySpending>()

        transactions.forEach((transaction) => {
            if (
                transaction.transferId
                || transaction.type !== 'EXPENSE'
            ) {
                return
            }

            const account = accountMap.get(transaction.accountId)

            if (!account) {
                return
            }

            if (account.currency !== spendingCurrency) {
                return
            }

            const category = transaction.categoryId
                ? categoryMap.get(transaction.categoryId)
                : undefined
            const id = category?.id ?? 'uncategorized'
            const current = grouped.get(id)

            grouped.set(id, {
                id,
                name: category?.name ?? t('transactions.uncategorized'),
                color: category?.color ?? '#8c9ab8',
                amount: (current?.amount ?? 0) + transaction.amount,
            })
        })

        const sorted = Array.from(grouped.values())
            .sort((first, second) => second.amount - first.amount)
        const items = sorted.length > 5
            ? [
                ...sorted.slice(0, 4),
                {
                    id: 'other',
                    name: t('transactions.other'),
                    color: '#7584a5',
                    amount: sorted.slice(4).reduce(
                        (total, item) => total + item.amount,
                        0,
                    ),
                },
            ]
            : sorted

        return {
            currency: spendingCurrency,
            items,
            total: sorted.reduce(
                (total, item) => total + item.amount,
                0,
            ),
        }
    }, [accountMap, categoryMap, spendingCurrency, transactions, t])

    const recurringCount = transactions.filter(
        (transaction) => Boolean(transaction.recurringTransactionTemplateId),
    ).length

    const visibleTransactions = useMemo(() => {
        const normalizedQuery =
            searchQuery.trim().toLocaleLowerCase()

        const filtered = transactions
            .filter((transaction) => {
                if (activityType === 'ALL') return true
                if (activityType === 'TRANSFER') {
                    return Boolean(transaction.transferId)
                }

                return !transaction.transferId
                    && transaction.type === activityType
            })
            .filter((transaction) => {
                if (!normalizedQuery) {
                    return true
                }

                const account = accountMap.get(transaction.accountId)
                const category = transaction.categoryId
                    ? categoryMap.get(transaction.categoryId)
                    : undefined
                const transfer = transaction.transferId
                    ? transferMap.get(transaction.transferId)
                    : undefined
                const source = transfer
                    ? accountMap.get(transfer.sourceAccountId)
                    : undefined
                const destination = transfer
                    ? accountMap.get(transfer.destinationAccountId)
                    : undefined

                return [
                    transaction.merchant,
                    transaction.note,
                    account?.name,
                    category?.name,
                    transfer?.note,
                    source?.name,
                    destination?.name,
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

        const seenTransfers = new Set<string>()

        return filtered.filter((transaction) => {
            if (!transaction.transferId) return true
            if (seenTransfers.has(transaction.transferId)) return false

            seenTransfers.add(transaction.transferId)
            return true
        })
    }, [
        accountMap,
        activityType,
        categoryMap,
        searchQuery,
        transferMap,
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

    const reloadWorkspace = () => {
        setLoadError('')
        setResourceState('loading')
        setTransactionState('loading')
        setReloadRevision((current) => current + 1)
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

    const loadState: LoadState =
        resourceState === 'error'
        || transactionState === 'error'
            ? 'error'
            : resourceState === 'loading'
            || transactionState === 'loading'
                ? 'loading'
                : 'ready'

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

                <section
                    className="transaction-metrics"
                    aria-label={t('transactions.summary')}
                >
                    <article>
                        <span className="metric-icon income">
                            <Icon name="cash"/>
                        </span>
                        <div>
                            <p>{t('transactions.income')}</p>
                            <strong>
                                {formatMoneyMap(
                                    metrics.income,
                                    locale,
                                    fallbackCurrency,
                                )}
                            </strong>
                            <small className="income">
                                {t('transactions.count', {count: metrics.incomeCount})}
                            </small>
                        </div>
                    </article>

                    <article>
                        <span className="metric-icon expense">
                            <Icon name="wallet"/>
                        </span>
                        <div>
                            <p>{t('transactions.expenses')}</p>
                            <strong>
                                {formatMoneyMap(
                                    metrics.expenses,
                                    locale,
                                    fallbackCurrency,
                                )}
                            </strong>
                            <small className="expense">
                                {t('transactions.count', {count: metrics.expenseCount})}
                            </small>
                        </div>
                    </article>

                    <article>
                        <span className="metric-icon income">
                            <Icon name="repeat"/>
                        </span>
                        <div>
                            <p>{t('transactions.netCashFlow')}</p>
                            <strong>
                                {formatMoneyMap(
                                    metrics.cashFlow,
                                    locale,
                                    fallbackCurrency,
                                    true,
                                )}
                            </strong>
                            <small>
                                {t('transactions.selectedPeriod')}
                            </small>
                        </div>
                    </article>

                    <article>
                        <span className="metric-icon average">
                            <Icon name="gauge"/>
                        </span>
                        <div>
                            <p>{t('transactions.averageSpend')}</p>
                            <strong>
                                {formatMoneyMap(
                                    metrics.averageSpend,
                                    locale,
                                    fallbackCurrency,
                                )}
                            </strong>
                            <small className="average">
                                {t('transactions.perExpense')}
                            </small>
                        </div>
                    </article>
                </section>

                <div className="transactions-content-grid">
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
                                            onClick={() => setActivityType(type)}
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
                                        onClick={() => {
                                            setResourceState('loading')
                                            setTransactionState('loading')
                                            setLoadError('')
                                            setReloadRevision(
                                                (current) => current + 1,
                                            )
                                        }}
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
                                                    transactions.length === 0
                                                        ? 'receipt'
                                                        : 'search'
                                                }
                                            />
                                        </span>
                                        <h3>
                                            {transactions.length === 0
                                                ? t('transactions.noTransactions')
                                                : t('transactions.notFound')}
                                        </h3>
                                        <p>
                                            {transactions.length === 0
                                                ? t('transactions.firstDescription')
                                                : t('transactions.filterDescription')}
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

                    <aside className="transactions-side-column">
                        <section className="spending-category-card">
                            <header>
                                <div>
                                    <h2>{t('transactions.spendingByCategory')}</h2>
                                    <p>{dateLabel}</p>
                                </div>
                                <div className="spending-category-summary">
                                    <Select
                                        className="spending-category-currency"
                                        aria-label="Spending currency"
                                        value={spendingCurrency}
                                        disabled={spendingCurrencyOptions.length < 2}
                                        onValueChange={(value) =>
                                            setRequestedSpendingCurrency(value as Currency)
                                        }
                                    >
                                        {spendingCurrencyOptions.map((currency) => (
                                            <SelectOption key={currency} value={currency}>
                                                {currency}
                                            </SelectOption>
                                        ))}
                                    </Select>
                                    {spendingByCategory.items.length > 0 && (
                                        <strong>
                                            {formatMoney(
                                                spendingByCategory.total,
                                                spendingByCategory.currency,
                                                locale,
                                            )}
                                        </strong>
                                    )}
                                </div>
                            </header>

                            {spendingByCategory.items.length === 0 && (
                                <div className="spending-category-message">
                                    <Icon name="categories"/>
                                    <p>
                                        {t('transactions.categoriesEmpty')}
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
                                                            spendingByCategory.currency,
                                                            locale,
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
                                <h2>{t('transactions.quickFilters')}</h2>
                                <p>{t('transactions.quickFiltersSubtitle')}</p>
                            </header>

                            <label htmlFor="transaction-period-filter">
                                {t('transactions.period')}
                            </label>
                            <div className="quick-filter-select wide">
                                <Icon name="calendar"/>
                                <Select
                                    id="transaction-period-filter"
                                    value={period}
                                    onValueChange={(value) => {
                                        const nextPeriod =
                                            value as PeriodPreset

                                        setPeriod(nextPeriod)

                                        if (nextPeriod === 'CUSTOM') {
                                            setCustomPeriodDraft(
                                                customPeriod,
                                            )
                                        }
                                    }}
                                >
                                    {periodPresets
                                        .map((value) => (
                                            <SelectOption value={value} key={value}>
                                                {t(`transactions.periods.${value}`)}
                                            </SelectOption>
                                        ))}
                                </Select>
                            </div>

                            {period === 'CUSTOM' && (
                                <form
                                    className="custom-period-filter"
                                    onSubmit={(event) => {
                                        event.preventDefault()

                                        if (canApplyCustomPeriod) {
                                            setCustomPeriod(
                                                customPeriodDraft,
                                            )
                                        }
                                    }}
                                >
                                    <label>
                                        <span>{t('transactions.from')}</span>
                                        <input
                                            type="date"
                                            value={customPeriodDraft.from}
                                            max={customPeriodDraft.to || undefined}
                                            onChange={(event) =>
                                                setCustomPeriodDraft((current) => ({
                                                    ...current,
                                                    from: event.target.value,
                                                }))
                                            }
                                        />
                                    </label>

                                    <label>
                                        <span>{t('transactions.to')}</span>
                                        <input
                                            type="date"
                                            value={customPeriodDraft.to}
                                            min={customPeriodDraft.from || undefined}
                                            onChange={(event) =>
                                                setCustomPeriodDraft((current) => ({
                                                    ...current,
                                                    to: event.target.value,
                                                }))
                                            }
                                        />
                                    </label>

                                    <button
                                        type="submit"
                                        disabled={!canApplyCustomPeriod}
                                    >
                                        {t('transactions.applyRange')}
                                    </button>

                                    {customPeriodIsReversed && (
                                        <p role="alert">
                                            {t('transactions.invalidRange')}
                                        </p>
                                    )}
                                </form>
                            )}

                            <label htmlFor="transaction-account-filter">
                                {t('transactions.account')}
                            </label>
                            <div className="quick-filter-grid">
                                <div className="quick-filter-select">
                                    <Icon name="card"/>
                                    <Select
                                        id="transaction-account-filter"
                                        value={accountFilter}
                                        onValueChange={(value) =>
                                            setAccountFilter(value)
                                        }
                                    >
                                        <SelectOption value="">{t('transactions.allAccounts')}</SelectOption>
                                        {accounts.map((account) => (
                                            <SelectOption
                                                value={account.id}
                                                key={account.id}
                                            >
                                                {account.name} · {account.currency}
                                            </SelectOption>
                                        ))}
                                    </Select>
                                </div>

                                <div className="quick-filter-select">
                                    <Icon name="tag"/>
                                    <Select
                                        aria-label={t('transactions.categoryFilter')}
                                        value={categoryFilter}
                                        onValueChange={(value) =>
                                            setCategoryFilter(value)
                                        }
                                    >
                                        <SelectOption value="">{t('transactions.allCategories')}</SelectOption>
                                        {categories.map((category) => (
                                            <SelectOption
                                                value={category.id}
                                                key={category.id}
                                            >
                                                {category.name}
                                            </SelectOption>
                                        ))}
                                    </Select>
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
                                            const defaultPeriod =
                                                getDefaultCustomPeriod(anchorDate)

                                            setCustomPeriod(defaultPeriod)
                                            setCustomPeriodDraft(defaultPeriod)
                                        }}
                                    >
                                        {t('transactions.clearFilters')}
                                    </button>
                                )}
                        </section>

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
