import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import {
    clearTransactionsDestination,
    getTransactionsDestination,
    rememberTransactionsDestination,
} from './transactionsDestination'

beforeEach(() => window.sessionStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('transactionsDestination', () => {
    it('remembers a destination only for the current profile and tab', () => {
        rememberTransactionsDestination(
            'profile-1',
            new URLSearchParams('period=all-time&q=rent'),
        )

        expect(getTransactionsDestination('profile-1'))
            .toBe('/transactions?period=all-time&q=rent')
        expect(getTransactionsDestination('profile-2'))
            .toBe('/transactions')
        expect(getTransactionsDestination(null))
            .toBe('/transactions')

        clearTransactionsDestination('profile-1')
        expect(getTransactionsDestination('profile-1'))
            .toBe('/transactions')
    })

    it('rejects malformed or external stored destinations', () => {
        for (const destination of [
            'https://example.com/transactions?period=all-time',
            '//example.com/transactions',
            '/transactions/other?period=all-time',
            '/transactions#other',
        ]) {
            window.sessionStorage.setItem(
                'certis.transactions.lastUrl.profile-1',
                destination,
            )
            expect(getTransactionsDestination('profile-1'))
                .toBe('/transactions')
        }
    })

    it('falls back safely when storage is unavailable', () => {
        vi.spyOn(Storage.prototype, 'getItem')
            .mockImplementation(() => { throw new Error('blocked') })
        vi.spyOn(Storage.prototype, 'setItem')
            .mockImplementation(() => { throw new Error('blocked') })
        vi.spyOn(Storage.prototype, 'removeItem')
            .mockImplementation(() => { throw new Error('blocked') })

        expect(getTransactionsDestination('profile-1'))
            .toBe('/transactions')
        expect(() => rememberTransactionsDestination(
            'profile-1',
            new URLSearchParams('q=rent'),
        )).not.toThrow()
        expect(() => clearTransactionsDestination('profile-1'))
            .not.toThrow()
    })
})
