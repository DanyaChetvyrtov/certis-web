import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Icon} from '../../../components/Icons'
import {WorkspaceSidebar} from '../../../layouts/WorkspaceSidebar'
import {ApiError} from '../../../shared/api/ApiError'
import {
    accountTypes,
    accountTypeLabels,
    currencies,
    getAccounts,
} from '../api/accountsApi'
import type {
    Account,
    AccountType,
    Currency,
} from '../api/accountsApi'
import {AccountFormModal} from '../components/AccountFormModal'
import {CloseAccountDialog} from '../components/CloseAccountDialog'
import './AccountsPage.css'
import {
    AccountActionMenu,
} from '../components/AccountActionMenu'

type AccountFilter = 'all' | 'active' | 'closed'
type AccountSort = 'newest' | 'name' | 'balance'

const currencySymbols: Record<Currency, string> = {
    RUB: '₽',
    EUR: '€',
    USD: '$',
}

const typeColors: Record<AccountType, string> = {
    CARD: '#10b889',
    BANK: '#b89052',
    CASH: '#102647',
    INVESTMENT: '#6572c9',
}

const accountIcon = (type: AccountType) => {
    if (type === 'CARD') return 'card'
    if (type === 'CASH') return 'cash'
    if (type === 'BANK') return 'bank'
    return 'gauge'
}

const formatAmount = (
    amount: number,
    currency: Currency,
    maximumFractionDigits = 2,
) => {
    const value = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: maximumFractionDigits,
        maximumFractionDigits,
    }).format(Math.abs(amount))
    return `${amount < 0 ? '-' : ''}${currencySymbols[currency]}${value}`
}

const formatDate = (date: string) => new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
}).format(new Date(date))

const accountErrorMessage = (error: unknown) => (
    error instanceof ApiError
        ? error.message
        : 'We could not load your accounts. Please try again.'
)

export function AccountsPage() {
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
    const [loadError, setLoadError] = useState('')
    const [filter, setFilter] = useState<AccountFilter>('all')
    const [sort, setSort] = useState<AccountSort>('newest')
    const [searchQuery, setSearchQuery] = useState('')
    const [currency, setCurrency] = useState<Currency>('RUB')
    const [notice, setNotice] = useState('')

    const searchInputRef = useRef<HTMLInputElement>(null)
    const accountsHeadingRef = useRef<HTMLHeadingElement>(null)

    type AccountModalState = {
        account: Account | 'new'
        restoreFocus?: () => void
    }

    type CloseAccountState = {
        account: Account
        restoreFocus: () => void
    }

    const [formModal, setFormModal,] =
        useState<AccountModalState | null>(
            null,
        )

    const [closeDialog, setCloseDialog] = useState<CloseAccountState | null>(
        null,
    )

    const focusAccountsHeading =
        (): void => {
            accountsHeadingRef.current
                ?.focus()
        }

    const openNewAccount = (): void => {
        setFormModal({
            account: 'new',
        })
    }

    const editAccount = (
        account: Account,
        restoreFocus: () => void,
    ): void => {
        setFormModal({
            account,
            restoreFocus,
        })
    }

    const requestAccountClose = (
        account: Account,
        restoreFocus: () => void,
    ): void => {
        setCloseDialog({
            account,
            restoreFocus,
        })
    }

    const loadAccounts = useCallback(async () => {
        setLoadState('loading')
        setLoadError('')

        try {
            const loadedAccounts = await getAccounts()
            setAccounts(loadedAccounts)
            setLoadState('ready')
        } catch (error) {
            setLoadError(accountErrorMessage(error))
            setLoadState('error')
        }
    }, [])

    useEffect(() => {
        let isActive = true

        void getAccounts().then(
            (loadedAccounts) => {
                if (isActive) {
                    setAccounts(loadedAccounts)
                    setLoadState('ready')
                }
            },
            (error: unknown) => {
                if (isActive) {
                    setLoadError(accountErrorMessage(error))
                    setLoadState('error')
                }
            },
        )

        return () => {
            isActive = false
        }
    }, [])

    useEffect(() => {
        if (!notice) return
        const timeoutId = window.setTimeout(() => setNotice(''), 3200)
        return () => window.clearTimeout(timeoutId)
    }, [notice])

    const activeAccounts = useMemo(
        () => accounts.filter((account) => !account.closedAt),
        [accounts],
    )
    const closedAccounts = useMemo(
        () => accounts.filter((account) => Boolean(account.closedAt)),
        [accounts],
    )
    const currencyAccounts = useMemo(
        () => activeAccounts.filter((account) => account.currency === currency),
        [activeAccounts, currency],
    )
    const totalBalance = currencyAccounts.reduce(
        (sum, account) => sum + account.balance,
        0,
    )

    const balanceByType = useMemo(() => {
        const grouped = accountTypes.map((type) => {
            const typeBalance = currencyAccounts
                .filter((account) => account.type === type)
                .reduce((sum, account) => sum + account.balance, 0)
            return {type, balance: typeBalance}
        }).filter((item) => item.balance !== 0)
        const compositionTotal = grouped.reduce(
            (sum, item) => sum + Math.abs(item.balance),
            0,
        )

        return grouped.map((item) => ({
            ...item,
            percentage: compositionTotal === 0
                ? 0
                : Math.round((Math.abs(item.balance) / compositionTotal) * 100),
        }))
    }, [currencyAccounts])

    const visibleAccounts = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLocaleLowerCase()
        const filtered = accounts.filter((account) => {
            const matchesStatus = filter === 'all'
                || (filter === 'active' && !account.closedAt)
                || (filter === 'closed' && Boolean(account.closedAt))
            const matchesSearch = !normalizedQuery
                || account.name.toLocaleLowerCase().includes(normalizedQuery)
                || accountTypeLabels[account.type].toLocaleLowerCase().includes(normalizedQuery)
                || account.currency.toLocaleLowerCase().includes(normalizedQuery)
            return matchesStatus && matchesSearch
        })

        return [...filtered].sort((first, second) => {
            if (sort === 'name') return first.name.localeCompare(second.name)
            if (sort === 'balance') return second.balance - first.balance
            return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
        })
    }, [accounts, filter, searchQuery, sort])

    const saveAccount = (
        savedAccount: Account,
    ) => {
        const isNewAccount =
            formModal?.account === 'new'

        setAccounts((current) => {
            const accountExists =
                current.some(
                    (account) =>
                        account.id === savedAccount.id
                )

            return accountExists
                ? current.map(
                    (account) =>
                        account.id === savedAccount.id ? savedAccount : account,
                )
                : [savedAccount, ...current]
        })

        setFormModal(null)
        setNotice(isNewAccount ? 'Account created.' : 'Account updated.',)
    }

    const finishClosing = async () => {
        const closedName =
            closeDialog?.account.name

        await loadAccounts()

        setCloseDialog(null)

        setNotice(
            closedName
                ? `${closedName} was closed.`
                : 'Account closed.',
        )
    }

    return (
        <div className="accounts-workspace">
            <WorkspaceSidebar
                activePage="accounts"
                activeAccounts={activeAccounts.length}
            />

            <main className="accounts-main">
                <header className="accounts-page-header">
                    <div>
                        <p>Money sources</p>
                        <h1>Accounts</h1>
                        <span>Manage every place where your money lives.</span>
                    </div>
                    <div className="accounts-header-actions">
                        <button
                            className="accounts-icon-button"
                            type="button"
                            aria-label="Focus account search"
                            onClick={() => searchInputRef.current?.focus()}
                        >
                            <Icon name="search"/>
                        </button>
                        <button
                            className="accounts-icon-button notification-button"
                            type="button"
                            aria-label="Notifications are not available yet"
                            disabled
                        >
                            <Icon name="bell"/>
                        </button>
                        <button
                            className="new-account-button"
                            type="button"
                            onClick={openNewAccount}
                        >
                            <Icon name="plus"/>
                            New account
                        </button>
                    </div>
                </header>

                {notice && <div className="accounts-notice" role="status">{notice}</div>}

                <section className="accounts-summary-card" aria-label="Balance summary">
                    <div className="total-balance-panel">
                        <p>Total balance · {currency}</p>
                        <strong>{formatAmount(totalBalance, currency, 0)}</strong>
                        <div className="account-counts">
                            <span><i/>{activeAccounts.length} active</span>
                            <span>{closedAccounts.length} closed</span>
                        </div>
                        <small>Only open accounts are included in the total.</small>
                    </div>

                    <div className="balance-type-panel">
                        <div className="balance-type-heading">
                            <p>Balance by type</p>
                            <label>
                                <span className="sr-only">Summary currency</span>
                                <select
                                    value={currency}
                                    onChange={(event) => setCurrency(event.target.value as Currency)}
                                >
                                    {currencies.map((item) => <option value={item} key={item}>{item}</option>)}
                                </select>
                            </label>
                        </div>

                        {balanceByType.length === 0 ? (
                            <div className="balance-type-empty">
                                No active {currency} accounts yet.
                            </div>
                        ) : (
                            <div className="balance-type-list">
                                {balanceByType.map((item) => (
                                    <div className="balance-type-row" key={item.type}>
                                        <span>{accountTypeLabels[item.type]}</span>
                                        <span className="balance-type-track">
                      <i
                          style={{
                              width: `${item.percentage}%`,
                              background: typeColors[item.type],
                          }}
                      />
                    </span>
                                        <strong>{formatAmount(item.balance, currency, 0)}</strong>
                                        <small>{item.percentage}%</small>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <section className="accounts-list-card">
                    <div className="accounts-list-heading">
                        <div>
                            <h2
                                ref={accountsHeadingRef}
                                tabIndex={-1}
                            >
                                Your accounts
                            </h2>
                            <p>Balances update automatically from transactions and goal transfers.</p>
                        </div>
                    </div>

                    <div className="accounts-list-toolbar">
                        <div className="account-filter-tabs" role="group" aria-label="Filter accounts">
                            <button
                                className={filter === 'all' ? 'active' : undefined}
                                type="button"
                                onClick={() => setFilter('all')}
                            >
                                All · {accounts.length}
                            </button>
                            <button
                                className={filter === 'active' ? 'active' : undefined}
                                type="button"
                                onClick={() => setFilter('active')}
                            >
                                Active · {activeAccounts.length}
                            </button>
                            <button
                                className={filter === 'closed' ? 'active' : undefined}
                                type="button"
                                onClick={() => setFilter('closed')}
                            >
                                Closed · {closedAccounts.length}
                            </button>
                        </div>

                        <div className="account-search-sort">
                            <label className="account-search-field">
                                <Icon name="search"/>
                                <span className="sr-only">Search accounts</span>
                                <input
                                    ref={searchInputRef}
                                    type="search"
                                    placeholder="Search accounts"
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                />
                            </label>
                            <label className="account-sort-field">
                                <span className="sr-only">Sort accounts</span>
                                <select
                                    value={sort}
                                    onChange={(event) => setSort(event.target.value as AccountSort)}
                                >
                                    <option value="newest">Newest</option>
                                    <option value="name">Name</option>
                                    <option value="balance">Balance</option>
                                </select>
                                <Icon name="chevron-down"/>
                            </label>
                        </div>
                    </div>

                    <div className="account-table-head" aria-hidden="true">
                        <span>Account</span>
                        <span>Current balance</span>
                        <span>Account timeline</span>
                        <span>Status</span>
                        <span/>
                    </div>

                    {loadState === 'loading' && (
                        <div className="account-loading-state" aria-label="Loading accounts">
                            {[0, 1, 2].map((item) => <span key={item}/>)}
                        </div>
                    )}

                    {loadState === 'error' && (
                        <div className="account-empty-state" role="alert">
                            <span><Icon name="alert"/></span>
                            <h3>Accounts could not be loaded</h3>
                            <p>{loadError}</p>
                            <button type="button" onClick={() => void loadAccounts()}>Try again</button>
                        </div>
                    )}

                    {loadState === 'ready' && visibleAccounts.length === 0 && (
                        <div className="account-empty-state">
                            <span><Icon name={accounts.length === 0 ? 'wallet' : 'search'}/></span>
                            <h3>{accounts.length === 0 ? 'Create your first account' : 'No accounts found'}</h3>
                            <p>
                                {accounts.length === 0
                                    ? 'Add cash, a card, a bank account, or an investment account.'
                                    : 'Try changing the filter or search query.'}
                            </p>
                            {accounts.length === 0 && (
                                <button type="button" onClick={openNewAccount}>
                                    Add account
                                </button>
                            )}
                        </div>
                    )}

                    {loadState === 'ready' && visibleAccounts.length > 0 && (
                        <div className="account-rows">
                            {visibleAccounts.map((account) => {
                                const isClosed = Boolean(account.closedAt)
                                return (
                                    <article className={isClosed ? 'account-row closed' : 'account-row'}
                                             key={account.id}>
                                        <div className="account-identity">
                      <span className={`account-row-icon type-${account.type.toLowerCase()}`}>
                        <Icon name={accountIcon(account.type)}/>
                      </span>
                                            <span>
                        <strong>{account.name}</strong>
                        <small>{accountTypeLabels[account.type]} · {account.currency}</small>
                      </span>
                                        </div>
                                        <div className="account-balance">
                                            <strong>{formatAmount(account.balance, account.currency)}</strong>
                                            <small>{isClosed ? 'Final balance' : 'Calculated balance'}</small>
                                        </div>
                                        <div className="account-timeline">
                                            <span>{isClosed ? `Closed ${formatDate(account.closedAt!)}` : `Created ${formatDate(account.createdAt)}`}</span>
                                        </div>
                                        <div>
                                            <span className={isClosed ? 'account-status closed' : 'account-status'}>
                                            {!isClosed && <i/>}
                                                {isClosed ? 'Closed' : 'Active'}
                                            </span>
                                        </div>
                                        {!isClosed && (
                                            <AccountActionMenu
                                                account={account}
                                                fallbackRestoreFocus={
                                                    focusAccountsHeading
                                                }
                                                onEdit={editAccount}
                                                onCloseAccount={
                                                    requestAccountClose
                                                }
                                            />
                                        )}
                                    </article>
                                )
                            })}
                        </div>
                    )}
                </section>
            </main>

            {formModal && (
                <AccountFormModal
                    account={
                        formModal.account === 'new'
                            ? undefined
                            : formModal.account
                    }
                    onClose={() =>
                        setFormModal(null)
                    }
                    onSaved={saveAccount}
                    restoreFocus={
                        formModal.restoreFocus
                    }
                />
            )}
            {closeDialog && (
                <CloseAccountDialog
                    account={closeDialog.account}
                    onCancel={() =>
                        setCloseDialog(null)
                    }
                    onClosed={finishClosing}
                    restoreFocus={
                        closeDialog.restoreFocus
                    }
                />
            )}
        </div>
    )
}
