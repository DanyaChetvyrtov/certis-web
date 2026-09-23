import {
    getDefaultSpendingCurrency,
    getDefaultTransactionFilters,
    parseTransactionFilters,
    resolveTransactionFilters,
    serializeTransactionFilters,
} from './transactionFilters'
import {
    describe,
    expect,
    it,
} from 'vitest'

const anchorDate = new Date(2026, 8, 23)

describe('transactionFilters', () => {
    it('parses and serializes every applied filter while preserving unrelated params', () => {
        const params = new URLSearchParams(
            'view=recurring&period=custom&from=2026-07-10&to=2026-08-12'
            + '&account=account-1&category=category-1&type=transfer'
            + '&q=rent&currency=EUR&extra=keep',
        )
        const filters = parseTransactionFilters(params, anchorDate)

        expect(filters).toEqual({
            period: 'CUSTOM',
            customPeriod: {
                from: '2026-07-10',
                to: '2026-08-12',
            },
            accountId: 'account-1',
            categoryId: 'category-1',
            activityType: 'TRANSFER',
            searchQuery: 'rent',
            currency: 'EUR',
        })
        expect(Object.fromEntries(serializeTransactionFilters(
            params,
            filters,
            'RUB',
        ))).toEqual(Object.fromEntries(params))
    })

    it('omits defaults and keeps relative presets relative', () => {
        const params = new URLSearchParams(
            'view=recurring&period=this-month&type=all&currency=RUB',
        )
        const filters = resolveTransactionFilters(
            parseTransactionFilters(params, anchorDate),
            {preferredCurrency: 'RUB'},
        )

        expect(filters).toEqual(getDefaultTransactionFilters(anchorDate))
        expect(serializeTransactionFilters(
            params,
            filters,
            'RUB',
        ).toString()).toBe('view=recurring')
        expect(parseTransactionFilters(
            new URLSearchParams('period=last-30-days'),
            new Date(2026, 9, 2),
        ).period).toBe('LAST_30_DAYS')
    })

    it('rejects malformed dates, reversed ranges, and unknown enum values', () => {
        for (const range of [
            'from=2026-02-30&to=2026-03-01',
            'from=2026-08-12&to=2026-07-10',
            'from=2026-7-10&to=2026-08-12',
            'from=2026-07-10',
        ]) {
            const params = new URLSearchParams(
                `view=recurring&period=custom&${range}&type=bogus&currency=GBP`,
            )
            const filters = parseTransactionFilters(params, anchorDate)

            expect(filters.period).toBe('THIS_MONTH')
            expect(filters.activityType).toBe('ALL')
            expect(filters.currency).toBeNull()
            expect(serializeTransactionFilters(
                params,
                filters,
                'RUB',
            ).toString()).toBe('view=recurring')
        }
    })

    it('removes unavailable identifiers and currencies after options load', () => {
        const filters = parseTransactionFilters(
            new URLSearchParams(
                'account=deleted&category=deleted&currency=EUR',
            ),
            anchorDate,
        )
        const resolved = resolveTransactionFilters(filters, {
            accountIds: ['active-account'],
            categoryIds: ['active-category'],
            currencies: ['RUB'],
            preferredCurrency: 'RUB',
        })

        expect(resolved.accountId).toBe('')
        expect(resolved.categoryId).toBe('')
        expect(resolved.currency).toBeNull()
        expect(serializeTransactionFilters(
            new URLSearchParams('extra=keep&account=deleted'),
            resolved,
            'RUB',
        ).toString()).toBe('extra=keep')
    })

    it('treats an available fallback currency as the default', () => {
        expect(getDefaultSpendingCurrency(['EUR', 'USD'], 'RUB'))
            .toBe('EUR')
        const filters = parseTransactionFilters(
            new URLSearchParams('currency=EUR'),
            anchorDate,
        )
        const resolved = resolveTransactionFilters(filters, {
            currencies: ['EUR', 'USD'],
            preferredCurrency: 'RUB',
        })

        expect(resolved.currency).toBeNull()
        expect(serializeTransactionFilters(
            new URLSearchParams('currency=EUR'),
            resolved,
            'EUR',
        ).toString()).toBe('')
    })
})
