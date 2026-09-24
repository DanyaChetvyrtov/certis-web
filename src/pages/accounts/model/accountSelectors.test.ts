import {describe, expect, it} from 'vitest'
import type {Account, AccountType} from '../../../features/accounts/api/accountsApi'
import {selectAccountSummary, selectVisibleAccounts} from './accountSelectors'

const accounts: Account[] = [
    {
        id: 'cash', name: 'Наличные', type: 'CASH', openingBalance: 0,
        balance: -50, currency: 'RUB', createdAt: '2026-08-01T00:00:00Z',
    },
    {
        id: 'card', name: 'Alpha card', type: 'CARD', openingBalance: 0,
        balance: 150, currency: 'RUB', createdAt: '2026-08-03T00:00:00Z',
    },
    {
        id: 'euro', name: 'Travel wallet', type: 'BANK', openingBalance: 0,
        balance: 900, currency: 'EUR', createdAt: '2026-08-02T00:00:00Z',
    },
    {
        id: 'closed', name: 'Old card', type: 'CARD', openingBalance: 0,
        balance: 500, currency: 'RUB', createdAt: '2026-07-01T00:00:00Z',
        closedAt: '2026-08-04T00:00:00Z',
    },
]

const typeLabel = (type: AccountType) => ({
    CASH: 'Наличные', BANK: 'Банковский счёт',
    CARD: 'Карта', INVESTMENT: 'Инвестиции',
})[type]

const ids = (items: Account[]) => items.map(({id}) => id)

describe('account selectors', () => {
    it('searches by name, translated type and currency after trimming case', () => {
        expect(ids(selectVisibleAccounts(accounts, 'all', 'newest', ' ALPHA ', 'ru', typeLabel)))
            .toEqual(['card'])
        expect(ids(selectVisibleAccounts(accounts, 'all', 'newest', 'КАРТА', 'ru', typeLabel)))
            .toEqual(['card', 'closed'])
        expect(ids(selectVisibleAccounts(accounts, 'all', 'newest', 'eur', 'ru', typeLabel)))
            .toEqual(['euro'])
    })

    it('filters status and returns no results for unmatched searches', () => {
        expect(ids(selectVisibleAccounts(accounts, 'active', 'newest', '', 'ru', typeLabel)))
            .toEqual(['card', 'euro', 'cash'])
        expect(ids(selectVisibleAccounts(accounts, 'closed', 'newest', '', 'ru', typeLabel)))
            .toEqual(['closed'])
        expect(selectVisibleAccounts(accounts, 'all', 'name', 'missing', 'ru', typeLabel))
            .toEqual([])
        expect(selectVisibleAccounts([], 'all', 'name', '', 'ru', typeLabel)).toEqual([])
    })

    it('sorts by locale-aware name, descending balance and newest creation', () => {
        expect(ids(selectVisibleAccounts(accounts, 'all', 'name', '', 'ru', typeLabel)))
            .toEqual(['cash', 'card', 'closed', 'euro'])
        expect(ids(selectVisibleAccounts(accounts, 'all', 'name', '', 'en', typeLabel)))
            .toEqual(['card', 'closed', 'euro', 'cash'])
        expect(ids(selectVisibleAccounts(accounts, 'all', 'balance', '', 'ru', typeLabel)))
            .toEqual(['euro', 'closed', 'card', 'cash'])
        expect(ids(selectVisibleAccounts(accounts, 'all', 'newest', '', 'ru', typeLabel)))
            .toEqual(['card', 'euro', 'cash', 'closed'])
        expect(ids(accounts)).toEqual(['cash', 'card', 'euro', 'closed'])
    })

    it('scopes totals to active accounts of one currency and uses absolute composition', () => {
        const rub = selectAccountSummary(accounts, 'RUB')
        expect(ids(rub.activeAccounts)).toEqual(['cash', 'card', 'euro'])
        expect(ids(rub.closedAccounts)).toEqual(['closed'])
        expect(rub.totalBalance).toBe(100)
        expect(rub.balanceByType).toEqual([
            {type: 'CASH', balance: -50, percentage: 25},
            {type: 'CARD', balance: 150, percentage: 75},
        ])
        const eur = selectAccountSummary(accounts, 'EUR')
        expect(eur.totalBalance).toBe(900)
        expect(eur.balanceByType).toEqual([{type: 'BANK', balance: 900, percentage: 100}])
        expect(selectAccountSummary(accounts, 'USD').balanceByType).toEqual([])
        expect(selectAccountSummary([], 'RUB')).toEqual({
            activeAccounts: [], closedAccounts: [], totalBalance: 0, balanceByType: [],
        })
    })
})
