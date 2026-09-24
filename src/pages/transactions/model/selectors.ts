import type {Account, Currency} from '../../../features/accounts/api/accountsApi'
import type {Category} from '../../../features/categories/api/categoriesApi'
import type {Transaction} from '../../../features/transactions/api/transactionsApi'
import type {Transfer} from '../../../features/transactions/api/transfersApi'
import type {ActivityType} from './transactionFilters'

export type PeriodRange = {
    from?: string
    to?: string
    start?: Date
    end?: Date
}

export type CategorySpending = {
    id: string
    name: string
    color: string
    amount: number
}

const currencyOrder: Currency[] = ['RUB', 'EUR', 'USD']

const addAmount = (
    map: Map<Currency, number>,
    currency: Currency,
    amount: number,
): void => {
    map.set(currency, (map.get(currency) ?? 0) + amount)
}

export const getSpendingCurrencyOptions = (
    transactions: readonly Transaction[],
    accountMap: Map<string, Account>,
    selectedAccount: Account | undefined,
    preferredCurrency: Currency,
): Currency[] => {
    if (selectedAccount) return [selectedAccount.currency]

    const currencies = new Set<Currency>()
    transactions.forEach((transaction) => {
        if (transaction.transferId || transaction.type !== 'EXPENSE') return
        const account = accountMap.get(transaction.accountId)
        if (account) currencies.add(account.currency)
    })
    const available = currencyOrder.filter((currency) => currencies.has(currency))
    return available.length > 0 ? available : [preferredCurrency]
}

export const getTransactionMetrics = (
    transactions: readonly Transaction[],
    accountMap: Map<string, Account>,
) => {
    const income = new Map<Currency, number>()
    const expenses = new Map<Currency, number>()
    const expenseCounts = new Map<Currency, number>()

    transactions.forEach((transaction) => {
        if (transaction.transferId) return
        const account = accountMap.get(transaction.accountId)
        if (!account) return
        if (transaction.type === 'INCOME') {
            addAmount(income, account.currency, transaction.amount)
        } else {
            addAmount(expenses, account.currency, transaction.amount)
            expenseCounts.set(account.currency,
                (expenseCounts.get(account.currency) ?? 0) + 1)
        }
    })

    const cashFlow = new Map<Currency, number>()
    const averageSpend = new Map<Currency, number>()
    new Set([...income.keys(), ...expenses.keys()]).forEach((currency) => {
        cashFlow.set(currency,
            (income.get(currency) ?? 0) - (expenses.get(currency) ?? 0))
    })
    expenses.forEach((amount, currency) => {
        averageSpend.set(currency, amount / (expenseCounts.get(currency) ?? 1))
    })

    return {
        income,
        expenses,
        cashFlow,
        averageSpend,
        incomeCount: transactions.filter((transaction) =>
            !transaction.transferId && transaction.type === 'INCOME').length,
        expenseCount: transactions.filter((transaction) =>
            !transaction.transferId && transaction.type === 'EXPENSE').length,
    }
}

export type TransactionMetrics = ReturnType<typeof getTransactionMetrics>

export const getSpendingByCategory = (
    transactions: readonly Transaction[],
    accountMap: Map<string, Account>,
    categoryMap: Map<string, Category>,
    currency: Currency,
    labels: {uncategorized: string, other: string},
) => {
    const grouped = new Map<string, CategorySpending>()
    transactions.forEach((transaction) => {
        if (transaction.transferId || transaction.type !== 'EXPENSE') return
        const account = accountMap.get(transaction.accountId)
        if (!account || account.currency !== currency) return
        const category = transaction.categoryId
            ? categoryMap.get(transaction.categoryId) : undefined
        const id = category?.id ?? 'uncategorized'
        const current = grouped.get(id)
        grouped.set(id, {
            id,
            name: category?.name ?? labels.uncategorized,
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
                name: labels.other,
                color: '#7584a5',
                amount: sorted.slice(4).reduce(
                    (total, item) => total + item.amount, 0),
            },
        ] : sorted
    return {
        currency,
        items,
        total: sorted.reduce((total, item) => total + item.amount, 0),
    }
}

export type SpendingByCategory = ReturnType<typeof getSpendingByCategory>

export const getVisibleTransactions = (
    transactions: readonly Transaction[],
    activityType: ActivityType,
    searchQuery: string,
    accountMap: Map<string, Account>,
    categoryMap: Map<string, Category>,
    transferMap: Map<string, Transfer>,
): Transaction[] => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase()
    const filtered = transactions
        .filter((transaction) => {
            if (activityType === 'ALL') return true
            if (activityType === 'TRANSFER') return Boolean(transaction.transferId)
            return !transaction.transferId && transaction.type === activityType
        })
        .filter((transaction) => {
            if (!normalizedQuery) return true
            const account = accountMap.get(transaction.accountId)
            const category = transaction.categoryId
                ? categoryMap.get(transaction.categoryId) : undefined
            const transfer = transaction.transferId
                ? transferMap.get(transaction.transferId) : undefined
            const source = transfer
                ? accountMap.get(transfer.sourceAccountId) : undefined
            const destination = transfer
                ? accountMap.get(transfer.destinationAccountId) : undefined
            return [
                transaction.merchant,
                transaction.note,
                account?.name,
                category?.name,
                transfer?.note,
                source?.name,
                destination?.name,
            ].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery))
        })
        .sort((first, second) =>
            new Date(second.occurredAt).getTime()
            - new Date(first.occurredAt).getTime())

    const seenTransfers = new Set<string>()
    return filtered.filter((transaction) => {
        if (!transaction.transferId) return true
        if (seenTransfers.has(transaction.transferId)) return false
        seenTransfers.add(transaction.transferId)
        return true
    })
}

export const groupDateKey = (dateValue: string): string => {
    const date = new Date(dateValue)
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-')
}

export const groupTransactionsByDate = (
    transactions: readonly Transaction[],
): Transaction[][] => {
    const groups = new Map<string, Transaction[]>()
    transactions.forEach((transaction) => {
        const key = groupDateKey(transaction.occurredAt)
        const group = groups.get(key) ?? []
        group.push(transaction)
        groups.set(key, group)
    })
    return Array.from(groups.values())
}

export const matchesTransactionFilters = (
    transaction: Transaction,
    accountFilter: string,
    categoryFilter: string,
    range: PeriodRange,
): boolean => {
    if (accountFilter && transaction.accountId !== accountFilter) return false
    if (categoryFilter && transaction.categoryId !== categoryFilter) return false
    const transactionDate = new Date(transaction.occurredAt).getTime()
    return (!range.from || transactionDate >= new Date(range.from).getTime())
        && (!range.to || transactionDate <= new Date(range.to).getTime())
}
