import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CertisLogo, Icon } from '../components/Icons'
import type { IconName } from '../components/Icons'
import { getAccounts } from '../features/accounts/api/accountsApi'
import type {
  Account,
  AccountCurrency,
  AccountType,
} from '../features/accounts/api/accountsApi'
import { useSession } from '../features/auth/session/SessionContext'
import { BudgetRing } from '../features/dashboard/components/BudgetRing'
import { CashFlowChart } from '../features/dashboard/components/CashFlowChart'
import type { CashFlowPoint } from '../features/dashboard/components/CashFlowChart'
import { ProfileSetupModal } from '../features/profile/ProfileSetupModal'
import type { Profile } from '../features/profile/api/profileApi'
import { ApiError } from '../shared/api/ApiError'
import './DashboardPage.css'

type AccountsStatus = 'loading' | 'ready' | 'error'

type NavigationItem = {
  label: string
  icon: IconName
  active?: boolean
  to?: string
}

const navigation: NavigationItem[] = [
  { label: 'Dashboard', icon: 'dashboard', active: true, to: '/dashboard' },
  { label: 'Accounts', icon: 'wallet', to: '/accounts' },
  { label: 'Transactions', icon: 'receipt' },
  { label: 'Budgets', icon: 'gauge' },
  { label: 'Goals', icon: 'target' },
  { label: 'Categories', icon: 'categories' },
]

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

const compactMoney = (value: number, currency: AccountCurrency) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    notation: 'compact',
    maximumFractionDigits: 1,
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

const createCashFlowData = (): CashFlowPoint[] => {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short' })
  const now = new Date()

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)

    return {
      label: formatter.format(date),
      income: 0,
      expenses: 0,
    }
  })
}

const cashFlowData = createCashFlowData()

type SummaryCardProps = {
  label: string
  value: string
  hint: string
  icon: IconName
  tone: 'navy' | 'green' | 'red' | 'gold'
}

function SummaryCard({ label, value, hint, icon, tone }: SummaryCardProps) {
  return (
    <article className="summary-card">
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{hint}</span>
      </div>
      <span className={`summary-card-icon summary-card-icon-${tone}`}>
        <Icon name={icon} />
      </span>
    </article>
  )
}

type PanelHeaderProps = {
  eyebrow?: string
  title: string
  action?: string
}

function PanelHeader({ eyebrow, title, action }: PanelHeaderProps) {
  return (
    <header className="dashboard-panel-header">
      <div>
        {eyebrow && <p>{eyebrow}</p>}
        <h2>{title}</h2>
      </div>
      {action && (
        <button type="button" disabled title={`${action} — coming soon`}>
          {action}
          <Icon name="chevron-right" />
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
        <Icon name={icon} />
      </span>
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  )
}

export function DashboardPage() {
  const { profile, setProfile } = useSession()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountsStatus, setAccountsStatus] = useState<AccountsStatus>('loading')
  const [accountsNotice, setAccountsNotice] = useState<string | null>(null)
  const [requestedCurrency, setRequestedCurrency] =
    useState<AccountCurrency>('RUB')
  const isProfileSetupOpen = profile === null

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

  const visibleAccounts = activeAccounts.filter(
    (account) => account.currency === selectedCurrency,
  )
  const totalBalance = visibleAccounts.reduce(
    (total, account) => total + Number(account.balance),
    0,
  )
  const profileName = profile?.name ?? 'there'
  const initials = profile
    ? `${profile.name.charAt(0)}${profile.surname.charAt(0)}`.toUpperCase()
    : 'C'

  const completeProfileSetup = (createdProfile: Profile) => {
    setProfile(createdProfile)
  }

  return (
    <div
      className={`dashboard-shell${isProfileSetupOpen ? ' dashboard-modal-open' : ''}`}
    >
      <aside className="dashboard-sidebar">
        <CertisLogo className="sidebar-logo" />

        <div className="sidebar-workspace">
          <p>Workspace</p>
          <nav aria-label="Workspace navigation">
            {navigation.map((item) => item.to ? (
              <Link
                key={item.label}
                to={item.to}
                className={item.active ? 'sidebar-link-active' : undefined}
                aria-current={item.active ? 'page' : undefined}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                disabled
                title={`${item.label} — coming soon`}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-spacer" />

        <aside className="sidebar-insight">
          <span className="sidebar-insight-icon">
            <Icon name="piggy-bank" />
          </span>
          <strong>
            {activeAccounts.length > 0 ? 'Your money, in one place' : 'Start with an account'}
          </strong>
          <p>
            {activeAccounts.length > 0
              ? `${activeAccounts.length} active ${activeAccounts.length === 1 ? 'account is' : 'accounts are'} connected to this workspace.`
              : 'Create your first account to start tracking balances and cash flow.'}
          </p>
        </aside>

        <div className="sidebar-footer">
          <button type="button" disabled title="Settings — coming soon">
            <Icon name="settings" />
            <span>Settings</span>
          </button>
          <div className="sidebar-user">
            <span>{initials}</span>
            <div>
              <strong>
                {profile ? `${profile.name} ${profile.surname.charAt(0)}.` : 'Certis user'}
              </strong>
              <small>Personal workspace</small>
            </div>
            <Icon name="chevron-right" />
          </div>
        </div>
      </aside>

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
              <Icon name="search" />
            </button>
            <button
              type="button"
              className="dashboard-icon-button dashboard-notification-button"
              disabled
              title="Notifications — coming soon"
              aria-label="Notifications — coming soon"
            >
              <Icon name="bell" />
            </button>
            <button
              type="button"
              className="dashboard-primary-action"
              disabled
              title="Add transaction — coming soon"
            >
              <Icon name="plus" />
              Add transaction
            </button>
          </div>
        </header>

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
            value={formatMoney(0, selectedCurrency)}
            hint="No transactions this month"
            icon="trend-up"
            tone="green"
          />
          <SummaryCard
            label="Expenses"
            value={formatMoney(0, selectedCurrency)}
            hint="No transactions this month"
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
          <article className="dashboard-panel cash-flow-panel">
            <PanelHeader eyebrow="Last 6 months" title="Cash flow" action="View report" />
            <div className="cash-flow-meta">
              <div className="chart-legend">
                <span className="legend-income">
                  <i /> Income <strong>{compactMoney(0, selectedCurrency)}</strong>
                </span>
                <span className="legend-expenses">
                  <i /> Expenses <strong>{compactMoney(0, selectedCurrency)}</strong>
                </span>
              </div>
              <span className="cash-flow-net">Net {formatMoney(0, selectedCurrency)}</span>
            </div>
            <CashFlowChart data={cashFlowData} currency={selectedCurrency} />
            <p className="chart-empty-copy">
              Your cash-flow trend will appear after you add transactions.
            </p>
          </article>

          <article className="dashboard-panel budget-panel">
            <PanelHeader eyebrow="This month" title="Budget overview" action="Manage" />
            <div className="budget-overview">
              <BudgetRing percentage={0} />
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
            <PanelHeader title="Accounts" action="View all" />
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
                  <span />
                  <span />
                  <span />
                </div>
              )}

              {accountsStatus === 'error' && (
                <div className="accounts-error" role="alert">
                  <Icon name="alert" />
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
                      <Icon name={accountTypeIcons[account.type]} />
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
              <Icon name="plus" />
              Add new account
            </button>
          </article>

          <article className="dashboard-panel goals-panel">
            <PanelHeader title="Goals" action="View all" />
            <EmptyState icon="target" title="No savings goals yet">
              Create a goal to turn a future purchase into a clear plan.
            </EmptyState>
            <div className="goal-preview-placeholder" aria-hidden="true">
              <span />
              <span />
            </div>
            <button
              type="button"
              className="dashboard-secondary-action"
              disabled
              title="Create goal — coming soon"
            >
              <Icon name="plus" />
              Create a goal
            </button>
          </article>

          <article className="dashboard-panel transactions-panel">
            <PanelHeader title="Recent transactions" action="View all" />
            <EmptyState icon="receipt" title="No transactions yet">
              Income and expenses will appear here in chronological order.
            </EmptyState>
            <div className="transaction-preview-list" aria-hidden="true">
              {[0, 1, 2].map((item) => (
                <span key={item}>
                  <i />
                  <i />
                  <i />
                </span>
              ))}
            </div>
          </article>
        </section>
      </main>

      {isProfileSetupOpen && (
        <ProfileSetupModal onComplete={completeProfileSetup} />
      )}
    </div>
  )
}
