import {accountTypes} from '../../../features/accounts/api/accountsApi'
import type {Account, AccountType, Currency} from '../../../features/accounts/api/accountsApi'

export type AccountFilter = 'all' | 'active' | 'closed'
export type AccountSort = 'newest' | 'name' | 'balance'

export function selectAccountSummary(accounts: Account[], currency: Currency) {
    const activeAccounts = accounts.filter((account) => !account.closedAt)
    const closedAccounts = accounts.filter((account) => Boolean(account.closedAt))
    const currencyAccounts = activeAccounts.filter((account) => account.currency === currency)
    const totalBalance = currencyAccounts.reduce(
        (sum, account) => sum + account.balance,
        0,
    )
    const grouped = accountTypes.map((type) => ({
        type,
        balance: currencyAccounts
            .filter((account) => account.type === type)
            .reduce((sum, account) => sum + account.balance, 0),
    })).filter((item) => item.balance !== 0)
    const compositionTotal = grouped.reduce(
        (sum, item) => sum + Math.abs(item.balance),
        0,
    )
    const balanceByType = grouped.map((item) => ({
        ...item,
        percentage: compositionTotal === 0
            ? 0
            : Math.round((Math.abs(item.balance) / compositionTotal) * 100),
    }))

    return {activeAccounts, closedAccounts, totalBalance, balanceByType}
}

export function selectVisibleAccounts(
    accounts: Account[],
    filter: AccountFilter,
    sort: AccountSort,
    searchQuery: string,
    locale: string,
    typeLabel: (type: AccountType) => string,
): Account[] {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase()
    const filtered = accounts.filter((account) => {
        const matchesStatus = filter === 'all'
            || (filter === 'active' && !account.closedAt)
            || (filter === 'closed' && Boolean(account.closedAt))
        const matchesSearch = !normalizedQuery
            || account.name.toLocaleLowerCase().includes(normalizedQuery)
            || typeLabel(account.type).toLocaleLowerCase().includes(normalizedQuery)
            || account.currency.toLocaleLowerCase().includes(normalizedQuery)
        return matchesStatus && matchesSearch
    })

    return [...filtered].sort((first, second) => {
        if (sort === 'name') return first.name.localeCompare(second.name, locale)
        if (sort === 'balance') return second.balance - first.balance
        return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    })
}
