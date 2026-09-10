import {Select, SelectOption} from '../components/Select'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import type {CSSProperties, ReactNode} from 'react'
import {useTranslation} from 'react-i18next'
import type {TFunction} from 'i18next'
import {Link} from 'react-router-dom'
import {Icon} from '../components/Icons'
import {LoadingIndicator} from '../components/LoadingIndicator'
import {WorkspaceSidebar} from '../layouts/WorkspaceSidebar'
import type {IconName} from '../components/Icons'
import {getAccounts} from '../features/accounts/api/accountsApi'
import type {
    Account,
    AccountCurrency,
    AccountType,
} from '../features/accounts/api/accountsApi'
import {AccountFormModal} from '../features/accounts/components/AccountFormModal'
import {useSession} from '../features/auth/session/SessionContext'
import {getCategoryOptions} from '../features/categories/api/categoriesApi'
import type {Category} from '../features/categories/api/categoriesApi'
import {BudgetRing} from '../features/dashboard/components/BudgetRing'
import {CashFlowPanel} from '../features/dashboard/components/CashFlowPanel'
import {
    useMonthlyTransactionAnalytics,
} from '../features/dashboard/hooks/useMonthlyTransactionAnalytics'
import {useDashboardGoals} from '../features/dashboard/hooks/useDashboardGoals'
import {
    useRecentTransactions,
} from '../features/dashboard/hooks/useRecentTransactions'
import {
    formatGoalMoney,
    formatGoalMonth,
    goalIconName,
} from '../features/goals/goalPresentation'
import {GoalFormModal} from '../features/goals/components/GoalFormModal'
import {ProfileSetupModal} from '../features/profile/ProfileSetupModal'
import type {Profile} from '../features/profile/api/profileApi'
import type {
    Transaction,
} from '../features/transactions/api/transactionsApi'
import {TransactionFormModal} from '../features/transactions/components/TransactionFormModal'
import {ApiError} from '../shared/api/ApiError'
import {useLanguage} from '../i18n/useLanguage'
import './DashboardPage.css'

type AccountsStatus = 'loading' | 'ready' | 'error'

type DashboardGoalStyle = CSSProperties & {
    '--dashboard-goal-accent': string
}

const dashboardGoalStyle = (color: string): DashboardGoalStyle => ({
    '--dashboard-goal-accent': color,
})

const accountTypeIcons: Record<AccountType, IconName> = {
    CASH: 'wallet',
    BANK: 'bank',
    CARD: 'credit-card',
    INVESTMENT: 'trend-up',
}

const currencyOrder: AccountCurrency[] = ['RUB', 'EUR', 'USD']

const formatMoney = (value: number, currency: AccountCurrency, locale: string) =>
    new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
        maximumFractionDigits: 2,
    }).format(value)

const getDateCopy = (locale: string) =>
    new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    }).format(new Date())

const getGreeting = (t: TFunction) => {
    const hour = new Date().getHours()

    if (hour < 12) {
        return t('dashboard.greeting.morning')
    }

    if (hour < 18) {
        return t('dashboard.greeting.afternoon')
    }

    return t('dashboard.greeting.evening')
}

const getCurrentMonth = (): string => {
    const now = new Date()

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const transactionCountHint = (transactionCount: number, t: TFunction): string => {
    if (transactionCount === 0) {
        return t('dashboard.noTransactionsMonth')
    }

    return t('dashboard.transactionCount', {count: transactionCount})
}

const transactionTitle = (transaction: Transaction, t: TFunction): string =>
    transaction.merchant?.trim()
    || transaction.note?.trim()
    || (transaction.transferId
        ? t('dashboard.accountTransfer')
        : transaction.type === 'INCOME'
            ? t('dashboard.incomeTransaction')
            : t('dashboard.expenseTransaction'))

const formatTransactionDate = (dateValue: string, locale: string): string =>
    new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
    }).format(new Date(dateValue))

const formatTransactionAmount = (
    transaction: Transaction,
    currency: AccountCurrency | undefined,
    locale: string,
): string => {
    const amount = Number(transaction.amount)
    const signedAmount = transaction.type === 'INCOME'
        ? amount
        : -amount

    if (!currency) {
        return new Intl.NumberFormat(locale, {
            maximumFractionDigits: 2,
        }).format(signedAmount)
    }

    const formatted = formatMoney(signedAmount, currency, locale)
        .replace(/^-/, '−')

    return transaction.type === 'INCOME' && amount > 0
        ? `+${formatted}`
        : formatted
}


type SummaryCardProps = {
    loading?: boolean
    label: string
    value: string
    hint: string
    icon: IconName
    tone: 'navy' | 'green' | 'red' | 'gold'
}

function SummaryCard({loading = false, label, value, hint, icon, tone}: SummaryCardProps) {
    const {t} = useTranslation()

    return (
        <article className="summary-card">
            <div className="summary-card-copy">
                <p>{label}</p>
                {loading
                    ? (
                        <LoadingIndicator
                            className="summary-card-loading"
                            label={t('dashboard.loadingLabel', {label: label.toLowerCase()})}
                            showLabel
                        />
                    )
                    : <strong>{value}</strong>}
                <span className="summary-card-hint">
                    {loading
                        ? t('dashboard.fetching')
                        : hint}
                </span>
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
    const {t} = useTranslation()

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
                <button type="button" disabled title={t('dashboard.comingSoon', {action})}>
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
    const {t} = useTranslation()
    const {locale} = useLanguage()
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
    const [isAccountFormOpen, setIsAccountFormOpen] = useState(false)
    const [isTransactionOpen, setIsTransactionOpen] = useState(false)
    const [isGoalFormOpen, setIsGoalFormOpen] = useState(false)
    const [isPreparingTransaction, setIsPreparingTransaction] = useState(false)
    const [transactionNotice, setTransactionNotice] = useState<{
        kind: 'success' | 'error' | 'no-accounts'
        message: string
    } | null>(null)
    const addTransactionButtonRef = useRef<HTMLButtonElement>(null)
    const addAccountButtonRef = useRef<HTMLButtonElement>(null)
    const addGoalButtonRef = useRef<HTMLButtonElement>(null)
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
                    message: t('dashboard.createAccountFirst'),
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
                    : t('dashboard.formLoadError'),
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
                            : t('dashboard.accountLoadError'),
                    )
                }
            },
        )

        return () => {
            isActive = false
        }
    }, [t])

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
                    : t('dashboard.accountLoadError'),
            )
        }
    }, [t])

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
    const {
        goals: dashboardGoals,
        totalGoals: totalDashboardGoals,
        loadState: dashboardGoalsState,
        reload: reloadDashboardGoals,
    } = useDashboardGoals(selectedCurrency, !isProfileSetupOpen)

    const handleTransactionSaved = () => {
        setIsTransactionOpen(false)
        setTransactionNotice({kind: 'success', message: t('dashboard.transactionAdded')})
        setDashboardRevision(revision => revision + 1)
        reloadRecentTransactions()
        void retryAccounts()
    }

    const handleAccountSaved = (savedAccount: Account) => {
        setAccounts((current) => [
            savedAccount,
            ...current.filter((account) => account.id !== savedAccount.id),
        ])
        setAccountsStatus('ready')
        setAccountsNotice(null)
        setRequestedCurrency(savedAccount.currency)
        setIsAccountFormOpen(false)
    }

    const handleGoalSaved = () => {
        setIsGoalFormOpen(false)
        reloadDashboardGoals()
        reloadRecentTransactions()
        setDashboardRevision(revision => revision + 1)
        void retryAccounts()
    }

    const restoreAccountFocus = useCallback(() => {
        addAccountButtonRef.current?.focus()
    }, [])

    const restoreGoalFocus = useCallback(() => {
        addGoalButtonRef.current?.focus()
    }, [])

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
    const profileName = profile?.name ?? t('dashboard.greeting.fallbackName')

    const completeProfileSetup = (createdProfile: Profile) => {
        setRequestedCurrency(createdProfile.preferredCurrency)
        setProfile(createdProfile)
    }

    const monthlySummaryValue = (amount: number | undefined): string => {
        if (monthlyAnalyticsState === 'error') {
            return '—'
        }

        return formatMoney(amount ?? 0, selectedCurrency, locale)
    }

    const monthlySummaryHint = (transactionCount: number | undefined): string => {
        if (monthlyAnalyticsState === 'error') {
            return t('dashboard.monthlyUnavailable')
        }

        return transactionCountHint(transactionCount ?? 0, t)
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
                        <p>{getDateCopy(locale)}</p>
                        <h1>
                            {getGreeting(t)}, {profileName}
                        </h1>
                        <span>{t('dashboard.subtitle')}</span>
                    </div>
                    <div className="dashboard-actions">
                        <button
                            type="button"
                            className="dashboard-icon-button"
                            disabled
                            title={t('dashboard.searchSoon')}
                            aria-label={t('dashboard.searchSoon')}
                        >
                            <Icon name="search"/>
                        </button>
                        <button
                            type="button"
                            className="dashboard-icon-button dashboard-notification-button"
                            disabled
                            title={t('dashboard.notificationsSoon')}
                            aria-label={t('dashboard.notificationsSoon')}
                        >
                            <Icon name="bell"/>
                        </button>
                        <label className="dashboard-currency-action">
                            <span>{t('dashboard.currency')}</span>
                            <Select
                                value={selectedCurrency}
                                onValueChange={(value) =>
                                    setRequestedCurrency(value as AccountCurrency)
                                }
                                disabled={availableCurrencies.length < 2}
                                aria-label={t('dashboard.currencyLabel')}
                            >
                                {(availableCurrencies.length > 0
                                        ? availableCurrencies
                                        : currencyOrder
                                ).map((currency) => (
                                    <SelectOption key={currency} value={currency}>
                                        {currency}
                                    </SelectOption>
                                ))}
                            </Select>
                        </label>
                    </div>
                </header>

                {transactionNotice && (
                    <div className={`dashboard-transaction-notice ${transactionNotice.kind}`}
                        role={transactionNotice.kind === 'error' ? 'alert' : 'status'}>
                        <span>{transactionNotice.message}</span>
                        {transactionNotice.kind === 'no-accounts' && <Link to="/accounts">{t('dashboard.goToAccounts')}</Link>}
                        {transactionNotice.kind === 'error' && (
                            <button type="button" disabled={isPreparingTransaction}
                                onClick={() => void openTransactionForm()}>{t('dashboard.tryAgain')}</button>
                        )}
                    </div>
                )}

                <section className="dashboard-summary" aria-label={t('dashboard.financialSummary')}>
                    <SummaryCard
                        label={t('dashboard.totalBalance')}
                        loading={accountsStatus === 'loading'}
                        value={
                            accountsStatus === 'error'
                                    ? '—'
                                    : formatMoney(totalBalance, selectedCurrency, locale)
                        }
                        hint={
                            visibleAccounts.length > 0
                                ? t('dashboard.acrossAccounts', {count: visibleAccounts.length})
                                : t('dashboard.addAccountHint')
                        }
                        icon="wallet"
                        tone="navy"
                    />
                    <SummaryCard
                        label={t('dashboard.income')}
                        loading={
                            monthlyAnalyticsState === 'loading'
                            || monthlyAnalyticsState === 'idle'
                        }
                        value={monthlySummaryValue(monthlyAnalytics?.income.amount)}
                        hint={monthlySummaryHint(monthlyAnalytics?.income.transactionCount)}
                        icon="trend-up"
                        tone="green"
                    />
                    <SummaryCard
                        label={t('dashboard.expenses')}
                        loading={
                            monthlyAnalyticsState === 'loading'
                            || monthlyAnalyticsState === 'idle'
                        }
                        value={monthlySummaryValue(monthlyAnalytics?.expenses.amount)}
                        hint={monthlySummaryHint(monthlyAnalytics?.expenses.transactionCount)}
                        icon="trend-down"
                        tone="red"
                    />
                    <SummaryCard
                        label={t('dashboard.savingsRate')}
                        value="0%"
                        hint={t('dashboard.firstMonthHint')}
                        icon="piggy-bank"
                        tone="gold"
                    />
                </section>

                <section className="dashboard-overview-grid">
                    <CashFlowPanel currency={selectedCurrency} enabled={!isProfileSetupOpen}
                        refreshRevision={dashboardRevision}/>

                    <article className="dashboard-panel budget-panel">
                        <PanelHeader eyebrow={t('dashboard.thisMonth')} title={t('dashboard.budgetOverview')} action={t('dashboard.manage')}/>
                        <div className="budget-overview">
                            <BudgetRing percentage={0}/>
                            <div>
                                <span>{t('dashboard.totalBudget')}</span>
                                <strong>{formatMoney(0, selectedCurrency, locale)}</strong>
                                <small>{t('dashboard.noBudget')}</small>
                            </div>
                        </div>
                        <EmptyState icon="gauge" title={t('dashboard.planMonth')}>
                            {t('dashboard.budgetEmpty')}
                        </EmptyState>
                    </article>
                </section>

                <section className="dashboard-detail-grid">
                    <article className="dashboard-panel accounts-panel">
                        <PanelHeader title={t('dashboard.accounts')} action={t('dashboard.viewAll')} actionHref="/accounts"/>
                        <div className="accounts-panel-summary">
                            <span>{t('dashboard.combinedBalance')}</span>
                            <strong>
                                {accountsStatus === 'ready'
                                    ? formatMoney(totalBalance, selectedCurrency, locale)
                                    : '—'}
                            </strong>
                        </div>

                        <div className="accounts-list">
                            {accountsStatus === 'loading' && (
                                <div className="accounts-loading" aria-label={t('dashboard.loadingAccounts')}>
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
                                        {t('dashboard.tryAgain')}
                                    </button>
                                </div>
                            )}

                            {accountsStatus === 'ready' && visibleAccounts.length === 0 && (
                                <EmptyState icon="wallet" title={t('dashboard.noAccounts')}>
                                    {t('dashboard.noAccountsDescription')}
                                </EmptyState>
                            )}

                            {accountsStatus === 'ready' &&
                                visibleAccounts.slice(0, 3).map((account) => (
                                    <div className="dashboard-account-row" key={account.id}>
                                        <span
                                            className={`dashboard-account-type-icon dashboard-account-type-${account.type.toLowerCase()}`}
                                        >
                                            <Icon name={accountTypeIcons[account.type]}/>
                                        </span>
                                        <div>
                                            <strong>{account.name}</strong>
                                            <small>{t(`dashboard.accountTypes.${account.type}`)}</small>
                                        </div>
                                        <b>{formatMoney(Number(account.balance), account.currency, locale)}</b>
                                    </div>
                                ))}
                        </div>

                        <button
                            type="button"
                            className="dashboard-secondary-action dashboard-panel-create-action"
                            ref={addAccountButtonRef}
                            disabled={isProfileSetupOpen}
                            onClick={() => setIsAccountFormOpen(true)}
                        >
                            <Icon name="plus"/>
                            {t('dashboard.addNewAccount')}
                        </button>
                    </article>

                    <article className="dashboard-panel goals-panel">
                        <PanelHeader
                            title={t('dashboard.goals')}
                            action={t('dashboard.viewAll')}
                            actionHref="/goals"
                        />

                        {(dashboardGoalsState === 'loading'
                            || dashboardGoalsState === 'idle') && (
                            <div
                                className="dashboard-goals-loading"
                                aria-label={t('dashboard.loadingGoals')}
                            >
                                <span/><span/>
                            </div>
                        )}

                        {dashboardGoalsState === 'error' && (
                            <div className="dashboard-goals-error" role="alert">
                                <Icon name="alert"/>
                                <p>{t('dashboard.goalLoadError')}</p>
                                <button type="button" onClick={reloadDashboardGoals}>
                                    {t('dashboard.tryAgain')}
                                </button>
                            </div>
                        )}

                        {dashboardGoalsState === 'ready'
                            && dashboardGoals.length === 0 && (
                            <EmptyState icon="target" title={t('dashboard.noGoals')}>
                                {t('dashboard.noGoalsDescription')}
                            </EmptyState>
                        )}

                        {dashboardGoalsState === 'ready'
                            && dashboardGoals.length > 0 && (
                            <div className="dashboard-goals-list">
                                {dashboardGoals.map((goal) => {
                                    const progress = Math.min(
                                        Math.max(goal.progressPercentage, 0),
                                        100,
                                    )

                                    return (
                                        <div
                                            className="dashboard-goal-row"
                                            key={goal.id}
                                            style={dashboardGoalStyle(goal.color)}
                                        >
                                            <header>
                                                <span><Icon name={goalIconName(goal.icon)}/></span>
                                                <div>
                                                    <strong>{goal.name}</strong>
                                                    <small>
                                                        {t('dashboard.goalTarget', {
                                                            date: formatGoalMonth(
                                                                goal.targetMonth,
                                                                locale,
                                                                t('dashboard.noGoalTarget'),
                                                            ),
                                                        })}
                                                    </small>
                                                </div>
                                                <b>{Math.round(goal.progressPercentage)}%</b>
                                            </header>
                                            <span className="dashboard-goal-progress">
                                                <i style={{width: `${progress}%`}}/>
                                            </span>
                                            <footer>
                                                <span>
                                                    {t('dashboard.goalSaved', {
                                                        amount: formatGoalMoney(
                                                            goal.savedAmount,
                                                            goal.currency,
                                                            locale,
                                                        ),
                                                    })}
                                                </span>
                                                <span>
                                                    {t('dashboard.goalLeft', {
                                                        amount: formatGoalMoney(
                                                            goal.remainingAmount,
                                                            goal.currency,
                                                            locale,
                                                        ),
                                                    })}
                                                </span>
                                            </footer>
                                        </div>
                                    )
                                })}
                                {totalDashboardGoals > dashboardGoals.length && (
                                    <span className="dashboard-goals-more">
                                        {t('dashboard.moreActiveGoals', {
                                            count: totalDashboardGoals - dashboardGoals.length,
                                        })}
                                    </span>
                                )}
                            </div>
                        )}

                        <button
                            type="button"
                            className="dashboard-secondary-action dashboard-panel-create-action"
                            ref={addGoalButtonRef}
                            disabled={isProfileSetupOpen}
                            onClick={() => setIsGoalFormOpen(true)}
                        >
                            <Icon name="plus"/>
                            {t('dashboard.createGoal')}
                        </button>
                    </article>

                    <article className="dashboard-panel transactions-panel">
                        <PanelHeader
                            title={t('dashboard.recentTransactions')}
                            action={t('dashboard.viewAll')}
                            actionHref="/transactions"
                        />

                        {(recentTransactionsState === 'loading'
                            || recentTransactionsState === 'idle') && (
                            <div
                                className="transaction-preview-list"
                                aria-label={t('dashboard.loadingTransactions')}
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
                                <p>{t('dashboard.transactionLoadError')}</p>
                                <button
                                    type="button"
                                    onClick={reloadRecentTransactions}
                                >
                                    {t('dashboard.tryAgain')}
                                </button>
                            </div>
                        )}

                        {recentTransactionsState === 'ready'
                            && recentTransactions.length === 0 && (
                            <EmptyState icon="receipt" title={t('dashboard.noTransactions')}>
                                {t('dashboard.noTransactionsDescription')}
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
                                                <strong>{transactionTitle(transaction, t)}</strong>
                                                <small>
                                                    {account?.name ?? t('dashboard.unknownAccount')}
                                                    {' · '}
                                                    <time dateTime={transaction.occurredAt}>
                                                        {formatTransactionDate(transaction.occurredAt, locale)}
                                                    </time>
                                                </small>
                                            </div>
                                            <strong
                                                className={`recent-transaction-amount recent-transaction-amount-${transactionTone}`}
                                            >
                                                {formatTransactionAmount(
                                                    transaction,
                                                    account?.currency,
                                                    locale,
                                                )}
                                            </strong>
                                        </article>
                                    )
                                })}
                            </div>
                        )}

                        <button
                            type="button"
                            className="dashboard-secondary-action dashboard-panel-create-action"
                            ref={addTransactionButtonRef}
                            disabled={isProfileSetupOpen || isPreparingTransaction}
                            aria-busy={isPreparingTransaction}
                            onClick={() => void openTransactionForm()}
                        >
                            {isPreparingTransaction
                                ? (
                                    <>
                                        <LoadingIndicator
                                            className="dashboard-action-loading"
                                            label={t('dashboard.loadingForm')}
                                        />
                                        {t('dashboard.loadingFormCopy')}
                                    </>
                                )
                                : (
                                    <>
                                        <Icon name="plus"/>
                                        {t('dashboard.addTransaction')}
                                    </>
                                )}
                        </button>
                    </article>
                </section>
            </main>

            {isProfileSetupOpen && (
                <ProfileSetupModal
                    onComplete={completeProfileSetup}
                    onSignOut={signOut}
                />
            )}

            {isAccountFormOpen && (
                <AccountFormModal
                    onClose={() => setIsAccountFormOpen(false)}
                    onSaved={handleAccountSaved}
                    restoreFocus={restoreAccountFocus}
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

            {isGoalFormOpen && (
                <GoalFormModal
                    accounts={accounts}
                    defaultCurrency={selectedCurrency}
                    onClose={() => setIsGoalFormOpen(false)}
                    onSaved={handleGoalSaved}
                    restoreFocus={restoreGoalFocus}
                />
            )}
        </div>
    )
}
