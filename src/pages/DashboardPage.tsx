import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import type {ReactNode} from 'react'
import {Link} from 'react-router-dom'
import {Icon} from '../components/Icons'
import {WorkspaceSidebar} from '../layouts/WorkspaceSidebar'
import type {IconName} from '../components/Icons'
import {getAccounts} from '../features/accounts/api/accountsApi'
import type {
    Account,
    AccountCurrency,
    AccountType,
} from '../features/accounts/api/accountsApi'
import {useSession} from '../features/auth/session/SessionContext'
import {getCategoryOptions} from '../features/categories/api/categoriesApi'
import type {Category} from '../features/categories/api/categoriesApi'
import {BudgetRing} from '../features/dashboard/components/BudgetRing'
import {CashFlowPanel} from '../features/dashboard/components/CashFlowPanel'
import {
    useMonthlyTransactionAnalytics,
} from '../features/dashboard/hooks/useMonthlyTransactionAnalytics'
import {
    useRecentTransactions,
} from '../features/dashboard/hooks/useRecentTransactions'
import {ProfileSetupModal} from '../features/profile/ProfileSetupModal'
import type {Profile} from '../features/profile/api/profileApi'
import type {
    Transaction,
} from '../features/transactions/api/transactionsApi'
import {TransactionFormModal} from '../features/transactions/components/TransactionFormModal'
import {ApiError} from '../shared/api/ApiError'
import './DashboardPage.css'

type AccountsStatus = 'loading' | 'ready' | 'error'

const accountTypeLabels: Record<AccountType, string> = {
    CASH: 'Cash',
    BANK: 'Bank account',
    CARD: 'Card',
    INVESTMENT: 'Investment',
}

const accountTypeIcons: Record<AccountType, IconName> = {
    CASH: 'wallet',
    BANK: 'bank',
    CARD: 'credit-card',
    INVESTMENT: 'trend-up',
}

const currencyOrder: AccountCurrency[] = ['RUB', 'EUR', 'USD']

const formatMoney = (value: number, currency: AccountCurrency) =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
        maximumFractionDigits: 2,
    }).format(value)

const getDateCopy = () =>
    new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    }).format(new Date())

const getGreeting = () => {
    const hour = new Date().getHours()

    if (hour < 12) {
        return 'Good morning'
    }

    if (hour < 18) {
        return 'Good afternoon'
    }

    return 'Good evening'
}

const getCurrentMonth = (): string => {
    const now = new Date()

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const transactionCountHint = (transactionCount: number): string => {
    if (transactionCount === 0) {
        return 'No transactions this month'
    }

    return `${transactionCount} ${transactionCount === 1 ? 'transaction' : 'transactions'} this month`
}

const transactionTitle = (transaction: Transaction): string =>
    transaction.merchant?.trim()
    || transaction.note?.trim()
    || (transaction.transferId
        ? 'Account transfer'
        : transaction.type === 'INCOME'
            ? 'Income transaction'
            : 'Expense transaction')

const formatTransactionDate = (dateValue: string): string =>
    new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
    }).format(new Date(dateValue))

const formatTransactionAmount = (
    transaction: Transaction,
    currency: AccountCurrency | undefined,
): string => {
    const amount = Number(transaction.amount)
    const signedAmount = transaction.type === 'INCOME'
        ? amount
        : -amount

    if (!currency) {
        return new Intl.NumberFormat('en-US', {
            maximumFractionDigits: 2,
        }).format(signedAmount)
    }

    const formatted = formatMoney(signedAmount, currency)
        .replace(/^-/, '−')

    return transaction.type === 'INCOME' && amount > 0
        ? `+${formatted}`
        : formatted
}


type SummaryCardProps = {
    label: string
    value: string
    hint: string
    icon: IconName
    tone: 'navy' | 'green' | 'red' | 'gold'
}

function SummaryCard({label, value, hint, icon, tone}: SummaryCardProps) {
    return (
        <article className="summary-card">
            <div>
                <p>{label}</p>
                <strong>{value}</strong>
                <span>{hint}</span>
            </div>
            <span className={`summary-card-icon summary-card-icon-${tone}`}>
        <Icon name={icon}/>
      </span>
        </article>
    )
}

type PanelHeaderProps = {
    eyebrow?: string
    title: string
    action?: string
    actionHref?: string
}

function PanelHeader({eyebrow, title, action, actionHref}: PanelHeaderProps) {
    return (
        <header className="dashboard-panel-header">
            <div>
                {eyebrow && <p>{eyebrow}</p>}
                <h2>{title}</h2>
            </div>
            {action && actionHref && (
                <Link to={actionHref}>
                    {action}
                    <Icon name="chevron-right"/>
                </Link>
            )}
            {action && !actionHref && (
                <button type="button" disabled title={`${action} — coming soon`}>
                    {action}
                    <Icon name="chevron-right"/>
                </button>
            )}
        </header>
    )
}

function EmptyState({
                        icon,
                        title,
                        children,
                    }: {
    icon: IconName
    title: string
    children: ReactNode
}) {
    return (
        <div className="dashboard-empty-state">
      <span>
        <Icon name={icon}/>
      </span>
            <strong>{title}</strong>
            <p>{children}</p>
        </div>
    )
}

export function DashboardPage() {
    const {
        profile,
        setProfile,
        signOut,
    } = useSession()
    const [accounts, setAccounts] = useState<Account[]>([])
    const [accountsStatus, setAccountsStatus] = useState<AccountsStatus>('loading')
    const [accountsNotice, setAccountsNotice] = useState<string | null>(null)
    const [requestedCurrency, setRequestedCurrency] =
        useState<AccountCurrency>(profile?.preferredCurrency ?? 'RUB')
    const [dashboardRevision, setDashboardRevision] = useState(0)
    const [transactionCategories, setTransactionCategories] = useState<Category[]>([])
    const [isTransactionOpen, setIsTransactionOpen] = useState(false)
    const [isPreparingTransaction, setIsPreparingTransaction] = useState(false)
    const [transactionNotice, setTransactionNotice] = useState<{
        kind: 'success' | 'error' | 'no-accounts'
        message: string
    } | null>(null)
    const addTransactionButtonRef = useRef<HTMLButtonElement>(null)
    const transactionRequestIdRef = useRef(0)
    const isProfileSetupOpen = profile === null

    useEffect(() => () => { transactionRequestIdRef.current += 1 }, [])

    const openTransactionForm = async () => {
        const requestId = ++transactionRequestIdRef.current
        setIsPreparingTransaction(true)
        setTransactionNotice(null)

        try {
            const [loadedAccounts, expenses, income] = await Promise.all([
                getAccounts(),
                getCategoryOptions('EXPENSE'),
                getCategoryOptions('INCOME'),
            ])
            if (requestId !== transactionRequestIdRef.current) return

            setAccounts(loadedAccounts)
            setAccountsStatus('ready')
            setAccountsNotice(null)
            if (!loadedAccounts.some(account => !account.closedAt)) {
                setTransactionNotice({
                    kind: 'no-accounts',
                    message: 'Create an account before adding a transaction.',
                })
                return
            }

            setTransactionCategories([
                ...expenses.map(category => ({...category, type: 'EXPENSE' as const})),
                ...income.map(category => ({...category, type: 'INCOME' as const})),
            ])
            setIsTransactionOpen(true)
        } catch (error) {
            if (requestId !== transactionRequestIdRef.current) return
            setTransactionNotice({
                kind: 'error',
                message: error instanceof ApiError ? error.message
                    : 'We could not load the transaction form. Please try again.',
            })
        } finally {
            if (requestId === transactionRequestIdRef.current) setIsPreparingTransaction(false)
        }
    }

    const restoreTransactionFocus = useCallback(() => {
        addTransactionButtonRef.current?.focus()
    }, [])

    useEffect(() => {
        let isActive = true

        void getAccounts().then(
            (loadedAccounts) => {
                if (isActive) {
                    setAccounts(loadedAccounts)
                    setAccountsStatus('ready')
                }
            },
            (error: unknown) => {
                if (isActive) {
                    setAccountsStatus('error')
                    setAccountsNotice(
                        error instanceof ApiError
                            ? error.message
                            : 'We could not load your accounts. Please try again.',
                    )
                }
            },
        )

        return () => {
            isActive = false
        }
    }, [])

    const retryAccounts = useCallback(async () => {
        setAccountsStatus('loading')
        setAccountsNotice(null)

        try {
            setAccounts(await getAccounts())
            setAccountsStatus('ready')
        } catch (error) {
            setAccountsStatus('error')
            setAccountsNotice(
                error instanceof ApiError
                    ? error.message
                    : 'We could not load your accounts. Please try again.',
            )
        }
    }, [])

    const activeAccounts = useMemo(
        () => accounts.filter((account) => !account.closedAt),
        [accounts],
    )

    const availableCurrencies = useMemo(() => {
        const currencies = new Set(activeAccounts.map((account) => account.currency))

        return currencyOrder.filter((currency) => currencies.has(currency))
    }, [activeAccounts])

    const selectedCurrency = availableCurrencies.includes(requestedCurrency)
        ? requestedCurrency
        : availableCurrencies[0] ?? requestedCurrency

    const currentMonth = getCurrentMonth()
    const {
        analytics: monthlyAnalytics,
        loadState: monthlyAnalyticsState,
    } = useMonthlyTransactionAnalytics(
        currentMonth,
        selectedCurrency,
        !isProfileSetupOpen,
        dashboardRevision,
    )
    const {
        transactions: recentTransactions,
        loadState: recentTransactionsState,
        reload: reloadRecentTransactions,
    } = useRecentTransactions(!isProfileSetupOpen)

    const handleTransactionSaved = () => {
        setIsTransactionOpen(false)
        setTransactionNotice({kind: 'success', message: 'Transaction added.'})
        setDashboardRevision(revision => revision + 1)
        reloadRecentTransactions()
        void retryAccounts()
    }

    const accountMap = useMemo(
        () => new Map(accounts.map((account) => [account.id, account])),
        [accounts],
    )

    const visibleAccounts = activeAccounts.filter(
        (account) => account.currency === selectedCurrency,
    )
    const totalBalance = visibleAccounts.reduce(
        (total, account) => total + Number(account.balance),
        0,
    )
    const profileName = profile?.name ?? 'there'

    const completeProfileSetup = (createdProfile: Profile) => {
        setRequestedCurrency(createdProfile.preferredCurrency)
        setProfile(createdProfile)
    }

    const monthlySummaryValue = (amount: number | undefined): string => {
        if (monthlyAnalyticsState === 'loading' || monthlyAnalyticsState === 'idle') {
            return 'Loading…'
        }

        if (monthlyAnalyticsState === 'error') {
            return '—'
        }

        return formatMoney(amount ?? 0, selectedCurrency)
    }

    const monthlySummaryHint = (transactionCount: number | undefined): string => {
        if (monthlyAnalyticsState === 'loading' || monthlyAnalyticsState === 'idle') {
            return 'Loading this month'
        }

        if (monthlyAnalyticsState === 'error') {
            return 'Monthly summary unavailable'
        }

        return transactionCountHint(transactionCount ?? 0)
    }

    return (
        <div className={`dashboard-shell${isProfileSetupOpen ? ' dashboard-modal-open' : ''}`}>
            <WorkspaceSidebar
                activePage="dashboard"
                activeAccounts={activeAccounts.length}
            />

            <main className="dashboard-content">
                <header className="dashboard-topbar">
                    <div>
                        <p>{getDateCopy()}</p>
                        <h1>
                            {getGreeting()}, {profileName}
                        </h1>
                        <span>Here&apos;s what your money is doing today.</span>
                    </div>
                    <div className="dashboard-actions">
                        <button
                            type="button"
                            className="dashboard-icon-button"
                            disabled
                            title="Search — coming soon"
                            aria-label="Search — coming soon"
                        >
                            <Icon name="search"/>
                        </button>
                        <button
                            type="button"
                            className="dashboard-icon-button dashboard-notification-button"
                            disabled
                            title="Notifications — coming soon"
                            aria-label="Notifications — coming soon"
                        >
                            <Icon name="bell"/>
                        </button>
                        <button
                            type="button"
                            className="dashboard-primary-action"
                            ref={addTransactionButtonRef}
                            disabled={isProfileSetupOpen || isPreparingTransaction}
                            aria-busy={isPreparingTransaction}
                            onClick={() => void openTransactionForm()}
                        >
                            <Icon name="plus"/>
                            {isPreparingTransaction ? 'Loading form…' : 'Add transaction'}
                        </button>
                    </div>
                </header>

                {transactionNotice && (
                    <div className={`dashboard-transaction-notice ${transactionNotice.kind}`}
                        role={transactionNotice.kind === 'error' ? 'alert' : 'status'}>
                        <span>{transactionNotice.message}</span>
                        {transactionNotice.kind === 'no-accounts' && <Link to="/accounts">Go to accounts</Link>}
                        {transactionNotice.kind === 'error' && (
                            <button type="button" disabled={isPreparingTransaction}
                                onClick={() => void openTransactionForm()}>Try again</button>
                        )}
                    </div>
                )}

                <section className="dashboard-summary" aria-label="Financial summary">
                    <SummaryCard
                        label="Total balance"
                        value={
                            accountsStatus === 'loading'
                                ? 'Loading…'
                                : accountsStatus === 'error'
                                    ? '—'
                                    : formatMoney(totalBalance, selectedCurrency)
                        }
                        hint={
                            visibleAccounts.length > 0
                                ? `Across ${visibleAccounts.length} active ${visibleAccounts.length === 1 ? 'account' : 'accounts'}`
                                : 'Add an account to get started'
                        }
                        icon="wallet"
                        tone="navy"
                    />
                    <SummaryCard
                        label="Income"
                        value={monthlySummaryValue(monthlyAnalytics?.income.amount)}
                        hint={monthlySummaryHint(monthlyAnalytics?.income.transactionCount)}
                        icon="trend-up"
                        tone="green"
                    />
                    <SummaryCard
                        label="Expenses"
                        value={monthlySummaryValue(monthlyAnalytics?.expenses.amount)}
                        hint={monthlySummaryHint(monthlyAnalytics?.expenses.transactionCount)}
                        icon="trend-down"
                        tone="red"
                    />
                    <SummaryCard
                        label="Savings rate"
                        value="0%"
                        hint="Available after your first month"
                        icon="piggy-bank"
                        tone="gold"
                    />
                </section>

                <section className="dashboard-overview-grid">
                    <CashFlowPanel currency={selectedCurrency} enabled={!isProfileSetupOpen}
                        refreshRevision={dashboardRevision}/>

                    <article className="dashboard-panel budget-panel">
                        <PanelHeader eyebrow="This month" title="Budget overview" action="Manage"/>
                        <div className="budget-overview">
                            <BudgetRing percentage={0}/>
                            <div>
                                <span>Total budget</span>
                                <strong>{formatMoney(0, selectedCurrency)}</strong>
                                <small>No budget created yet</small>
                            </div>
                        </div>
                        <EmptyState icon="gauge" title="Plan your month">
                            Category progress will appear here once budgets are available.
                        </EmptyState>
                    </article>
                </section>

                <section className="dashboard-detail-grid">
                    <article className="dashboard-panel accounts-panel">
                        <PanelHeader title="Accounts" action="View all" actionHref="/accounts"/>
                        <div className="accounts-panel-summary">
                            <span>Combined balance</span>
                            <strong>
                                {accountsStatus === 'ready'
                                    ? formatMoney(totalBalance, selectedCurrency)
                                    : '—'}
                            </strong>
                            <label>
                                <span className="sr-only">Balance currency</span>
                                <select
                                    value={selectedCurrency}
                                    onChange={(event) =>
                                        setRequestedCurrency(event.target.value as AccountCurrency)
                                    }
                                    disabled={availableCurrencies.length < 2}
                                    aria-label="Balance currency"
                                >
                                    {(availableCurrencies.length > 0
                                            ? availableCurrencies
                                            : currencyOrder
                                    ).map((currency) => (
                                        <option key={currency} value={currency}>
                                            {currency}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <div className="accounts-list">
                            {accountsStatus === 'loading' && (
                                <div className="accounts-loading" aria-label="Loading accounts">
                                    <span/>
                                    <span/>
                                    <span/>
                                </div>
                            )}

                            {accountsStatus === 'error' && (
                                <div className="accounts-error" role="alert">
                                    <Icon name="alert"/>
                                    <p>{accountsNotice}</p>
                                    <button type="button" onClick={() => void retryAccounts()}>
                                        Try again
                                    </button>
                                </div>
                            )}

                            {accountsStatus === 'ready' && visibleAccounts.length === 0 && (
                                <EmptyState icon="wallet" title="No accounts yet">
                                    Add an account to see its live balance on your dashboard.
                                </EmptyState>
                            )}

                            {accountsStatus === 'ready' &&
                                visibleAccounts.slice(0, 3).map((account) => (
                                    <div className="account-row" key={account.id}>
                    <span className={`account-type-icon account-type-${account.type.toLowerCase()}`}>
                      <Icon name={accountTypeIcons[account.type]}/>
                    </span>
                                        <div>
                                            <strong>{account.name}</strong>
                                            <small>{accountTypeLabels[account.type]}</small>
                                        </div>
                                        <b>{formatMoney(Number(account.balance), account.currency)}</b>
                                    </div>
                                ))}
                        </div>

                        <button
                            type="button"
                            className="dashboard-secondary-action"
                            disabled
                            title="Add new account — coming next"
                        >
                            <Icon name="plus"/>
                            Add new account
                        </button>
                    </article>

                    <article className="dashboard-panel goals-panel">
                        <PanelHeader title="Goals" action="View all"/>
                        <EmptyState icon="target" title="No savings goals yet">
                            Create a goal to turn a future purchase into a clear plan.
                        </EmptyState>
                        <div className="goal-preview-placeholder" aria-hidden="true">
                            <span/>
                            <span/>
                        </div>
                        <button
                            type="button"
                            className="dashboard-secondary-action"
                            disabled
                            title="Create goal — coming soon"
                        >
                            <Icon name="plus"/>
                            Create a goal
                        </button>
                    </article>

                    <article className="dashboard-panel transactions-panel">
                        <PanelHeader
                            title="Recent transactions"
                            action="View all"
                            actionHref="/transactions"
                        />

                        {(recentTransactionsState === 'loading'
                            || recentTransactionsState === 'idle') && (
                            <div
                                className="transaction-preview-list"
                                aria-label="Loading recent transactions"
                            >
                                {[0, 1, 2].map((item) => (
                                    <span key={item}>
                                        <i/>
                                        <i/>
                                        <i/>
                                    </span>
                                ))}
                            </div>
                        )}

                        {recentTransactionsState === 'error' && (
                            <div className="recent-transactions-error" role="alert">
                                <Icon name="alert"/>
                                <p>We could not load your recent transactions.</p>
                                <button
                                    type="button"
                                    onClick={reloadRecentTransactions}
                                >
                                    Try again
                                </button>
                            </div>
                        )}

                        {recentTransactionsState === 'ready'
                            && recentTransactions.length === 0 && (
                            <EmptyState icon="receipt" title="No transactions yet">
                                Income and expenses will appear here with the newest first.
                            </EmptyState>
                        )}

                        {recentTransactionsState === 'ready'
                            && recentTransactions.length > 0 && (
                            <div className="recent-transactions-list">
                                {recentTransactions.map((transaction) => {
                                    const account = accountMap.get(transaction.accountId)
                                    const transactionTone = transaction.transferId
                                        ? 'transfer'
                                        : transaction.type.toLowerCase()

                                    return (
                                        <article
                                            className="recent-transaction-row"
                                            key={transaction.id}
                                        >
                                            <span
                                                className={`recent-transaction-icon recent-transaction-icon-${transactionTone}`}
                                            >
                                                <Icon
                                                    name={transaction.transferId
                                                        ? 'transfer'
                                                        : transaction.type === 'INCOME'
                                                            ? 'cash'
                                                            : 'receipt'}
                                                />
                                            </span>
                                            <div className="recent-transaction-copy">
                                                <strong>{transactionTitle(transaction)}</strong>
                                                <small>
                                                    {account?.name ?? 'Unknown account'}
                                                    {' · '}
                                                    <time dateTime={transaction.occurredAt}>
                                                        {formatTransactionDate(transaction.occurredAt)}
                                                    </time>
                                                </small>
                                            </div>
                                            <strong
                                                className={`recent-transaction-amount recent-transaction-amount-${transactionTone}`}
                                            >
                                                {formatTransactionAmount(
                                                    transaction,
                                                    account?.currency,
                                                )}
                                            </strong>
                                        </article>
                                    )
                                })}
                            </div>
                        )}
                    </article>
                </section>
            </main>

            {isProfileSetupOpen && (
                <ProfileSetupModal
                    onComplete={completeProfileSetup}
                    onSignOut={signOut}
                />
            )}

            {isTransactionOpen && (
                <TransactionFormModal
                    accounts={accounts}
                    categories={transactionCategories}
                    onClose={() => setIsTransactionOpen(false)}
                    onSaved={handleTransactionSaved}
                    restoreFocus={restoreTransactionFocus}
                />
            )}
        </div>
    )
}
