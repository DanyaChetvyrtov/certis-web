import {describe, expect, it} from 'vitest'
import type {Account} from '../../../features/accounts/api/accountsApi'
import type {Category} from '../../../features/categories/api/categoriesApi'
import type {Transaction} from '../../../features/transactions/api/transactionsApi'
import type {Transfer} from '../../../features/transactions/api/transfersApi'
import {
    getSpendingByCategory,
    getSpendingCurrencyOptions,
    getTransactionMetrics,
    getVisibleTransactions,
    groupTransactionsByDate,
    matchesTransactionFilters,
} from './selectors'

const accounts: Account[] = [
    {
        id: 'rub', name: 'Main card', type: 'CARD', openingBalance: 0,
        balance: 0, currency: 'RUB', createdAt: '2026-09-01T00:00:00Z',
    },
    {
        id: 'eur', name: 'Travel cash', type: 'CASH', openingBalance: 0,
        balance: 0, currency: 'EUR', createdAt: '2026-09-01T00:00:00Z',
    },
]
const categories: Category[] = [
    {id: 'food', name: 'Food', type: 'EXPENSE', icon: 'utensils', color: '#f00'},
]
const accountMap = new Map(accounts.map((account) => [account.id, account]))
const categoryMap = new Map(categories.map((category) => [category.id, category]))

const transaction = (changes: Partial<Transaction>): Transaction => ({
    id: 'expense', accountId: 'rub', type: 'EXPENSE', amount: 100,
    categoryId: 'food', merchant: 'Market', note: 'Groceries',
    occurredAt: '2026-09-08T10:00:00Z',
    createdAt: '2026-09-08T10:00:00Z',
    updatedAt: '2026-09-08T10:00:00Z',
    transferId: null,
    ...changes,
})
const transfer: Transfer = {
    id: 'transfer', sourceAccountId: 'rub', destinationAccountId: 'eur',
    currency: 'RUB', amount: 30, note: 'Move to travel',
    occurredAt: '2026-09-09T10:00:00Z', createdAt: '2026-09-09T10:00:00Z',
}
const transferMap = new Map([[transfer.id, transfer]])
const postings = [
    transaction({id: 'transfer-out', transferId: 'transfer', amount: 30,
        categoryId: null, occurredAt: transfer.occurredAt}),
    transaction({id: 'transfer-in', transferId: 'transfer', type: 'INCOME',
        accountId: 'eur', amount: 30, categoryId: null,
        occurredAt: transfer.occurredAt}),
]

describe('Transactions selectors', () => {
    it('keeps currencies separate and excludes both transfer postings from metrics', () => {
        const items = [
            transaction({}),
            transaction({id: 'salary', type: 'INCOME', amount: 250}),
            transaction({id: 'euro', accountId: 'eur', amount: 12}),
            ...postings,
        ]
        const metrics = getTransactionMetrics(items, accountMap)
        expect(Object.fromEntries(metrics.income)).toEqual({RUB: 250})
        expect(Object.fromEntries(metrics.expenses)).toEqual({RUB: 100, EUR: 12})
        expect(Object.fromEntries(metrics.cashFlow)).toEqual({RUB: 150, EUR: -12})
        expect(metrics.expenseCount).toBe(2)
        expect(metrics.incomeCount).toBe(1)
        expect(getSpendingCurrencyOptions(items, accountMap, undefined, 'RUB'))
            .toEqual(['RUB', 'EUR'])
        expect(getSpendingCurrencyOptions(items, accountMap, accounts[1], 'RUB'))
            .toEqual(['EUR'])
    })

    it('groups category spending only in the selected currency', () => {
        const items = [transaction({}), transaction({id: 'euro',
            accountId: 'eur', amount: 12}), ...postings]
        const labels = {uncategorized: 'Uncategorized', other: 'Other'}
        expect(getSpendingByCategory(items, accountMap, categoryMap, 'RUB', labels))
            .toMatchObject({currency: 'RUB', total: 100,
                items: [{id: 'food', amount: 100}]})
        expect(getSpendingByCategory(items, accountMap, categoryMap, 'EUR', labels))
            .toMatchObject({currency: 'EUR', total: 12,
                items: [{id: 'food', amount: 12}]})
    })

    it('deduplicates transfer activity and searches linked account names', () => {
        const items = [transaction({}), ...postings]
        const transferActivity = getVisibleTransactions(
            items, 'TRANSFER', '', accountMap, categoryMap, transferMap,
        )
        expect(transferActivity).toHaveLength(1)
        expect(transferActivity[0].id).toBe('transfer-out')
        expect(getVisibleTransactions(items, 'ALL', 'travel',
            accountMap, categoryMap, transferMap)).toHaveLength(1)
        expect(getVisibleTransactions(items, 'EXPENSE', '',
            accountMap, categoryMap, transferMap)).toEqual([items[0]])
        expect(groupTransactionsByDate(items)).toHaveLength(2)
    })

    it('respects account, category and period boundaries and handles empty input', () => {
        const item = transaction({})
        const range = {
            from: '2026-09-08T00:00:00Z',
            to: '2026-09-08T23:59:59Z',
        }
        expect(matchesTransactionFilters(item, 'rub', 'food', range)).toBe(true)
        expect(matchesTransactionFilters(item, 'eur', 'food', range)).toBe(false)
        expect(matchesTransactionFilters(item, 'rub', 'other', range)).toBe(false)
        expect(matchesTransactionFilters(item, 'rub', 'food', {
            from: '2026-09-09T00:00:00Z',
        })).toBe(false)
        expect(groupTransactionsByDate([])).toEqual([])
        expect(getVisibleTransactions([], 'ALL', '', accountMap, categoryMap,
            transferMap)).toEqual([])
        expect(getSpendingByCategory([], accountMap, categoryMap, 'RUB', {
            uncategorized: 'Uncategorized', other: 'Other',
        })).toMatchObject({items: [], total: 0})
    })
})
