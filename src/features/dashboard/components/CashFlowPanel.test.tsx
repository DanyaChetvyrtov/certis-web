import {fireEvent, render, screen, waitFor} from '@testing-library/react'
import {http, HttpResponse} from 'msw'
import {describe, expect, it, vi} from 'vitest'
import {server} from '../../../test/server'
import {CashFlowPanel} from './CashFlowPanel'

vi.mock('./CashFlowChart', () => ({
    CashFlowChart: ({data}: {data: unknown}) => <div data-testid="chart">{JSON.stringify(data)}</div>,
}))

const response = {
    range: 'SIX_MONTHS', currency: 'RUB', granularity: 'MONTH',
    from: '2026-04-01T00:00:00Z', toExclusive: '2026-10-01T00:00:00Z',
    totals: {income: 100, expenses: 150, netCashFlow: -50},
    points: [{bucketStart: '2026-04-01T00:00:00Z', income: 100, expenses: 150, netCashFlow: -50}],
}

describe('CashFlowPanel', () => {
    it('requests all ranges and refreshes when currency changes', async () => {
        const queries: Record<string, string>[] = []
        server.use(http.get('/api/v1/transactions/analytics/cash-flow', ({request}) => {
            queries.push(Object.fromEntries(new URL(request.url).searchParams))
            return HttpResponse.json(response)
        }))
        const {rerender} = render(<CashFlowPanel currency="RUB" enabled/>)
        expect(await screen.findByText('Net -₽50')).toBeInTheDocument()
        expect(queries[0]).toEqual({range: 'SIX_MONTHS', currency: 'RUB',
            anchorDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone})
        for (const range of ['DAY', 'WEEK', 'MONTH', 'YEAR']) {
            fireEvent.change(screen.getByLabelText('Cash flow range'), {target: {value: range}})
            expect(screen.queryByTestId('chart')).not.toBeInTheDocument()
            await screen.findByTestId('chart')
            expect(queries.at(-1)?.range).toBe(range)
        }
        rerender(<CashFlowPanel currency="EUR" enabled/>)
        await screen.findByText('Net -€50')
        expect(queries.at(-1)?.currency).toBe('EUR')
    })

    it('retries errors and shows an empty period', async () => {
        let attempts = 0
        server.use(http.get('/api/v1/transactions/analytics/cash-flow', () => {
            attempts++
            return attempts === 1 ? HttpResponse.json({}, {status: 500})
                : HttpResponse.json({...response, totals: {income: 0, expenses: 0, netCashFlow: 0}, points: []})
        }))
        render(<CashFlowPanel currency="RUB" enabled/>)
        await screen.findByRole('alert')
        fireEvent.click(screen.getByText('Try again'))
        await screen.findByText('No income or expenses in this period.')
        expect(attempts).toBe(2)
    })

    it('does not request analytics before profile setup', async () => {
        const request = vi.fn(() => HttpResponse.json(response))
        server.use(http.get('/api/v1/transactions/analytics/cash-flow', request))
        const {rerender} = render(<CashFlowPanel currency="RUB" enabled={false}/>)
        expect(request).not.toHaveBeenCalled()
        rerender(<CashFlowPanel currency="RUB" enabled/>)
        await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    })
})
