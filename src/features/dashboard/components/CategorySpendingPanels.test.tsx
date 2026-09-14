import {fireEvent, render, screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {describe, expect, it, vi} from 'vitest'
import type {
    CategoryAnalytics,
    CategorySpendingOverTime,
} from '../../categories/api/categoriesApi'
import type {
    DashboardCategorySpendingOverTimeLoadState,
} from '../hooks/useDashboardCategorySpendingOverTime'
import {CategorySpendingPanels} from './CategorySpendingPanels'

vi.mock('./CategorySpendingOverTimeChart', () => ({
    CategorySpendingOverTimeChart: ({
        analytics,
        description,
    }: {
        analytics: CategorySpendingOverTime
        description: string
    }) => (
        <div
            role="img"
            aria-label={description}
            data-testid="category-trend-chart"
            data-series={analytics.series
                .map((series) => series.categoryName)
                .join('|')}
        />
    ),
}))

const monthlyAnalytics = {
    month: '2026-09',
    currency: 'RUB',
    type: 'EXPENSE',
    totalTransactionCount: 2,
    categorizedTransactionCount: 2,
    uncategorizedTransactionCount: 0,
    totalSum: 1000,
    categorizedSum: 1000,
    uncategorizedSum: 0,
    coveragePercentage: 100,
    topExpenseCategories: [{
        categoryId: 'groceries-id',
        name: 'Groceries',
        color: '#E6655A',
        amount: 1000,
        sharePercentage: 100,
    }],
} satisfies CategoryAnalytics

const trendAnalytics = {
    month: '2026-09',
    currency: 'RUB',
    type: 'EXPENSE',
    totalSum: 1500,
    series: [
        {
            categoryId: 'groceries-id',
            categoryName: 'Groceries',
            categoryColor: '#E6655A',
            total: 1200,
            points: [
                {bucketMonth: '2026-08', amount: 500},
                {bucketMonth: '2026-09', amount: 700},
            ],
        },
        {
            categoryId: null,
            categoryName: 'Backend Other',
            categoryColor: null,
            total: 300,
            points: [
                {bucketMonth: '2026-08', amount: 100},
                {bucketMonth: '2026-09', amount: 200},
            ],
        },
    ],
} satisfies CategorySpendingOverTime

type RenderOptions = {
    spendingOverTime?: CategorySpendingOverTime | null
    loadState?: DashboardCategorySpendingOverTimeLoadState
    onRetry?: () => void
}

const renderPanels = ({
    spendingOverTime = trendAnalytics,
    loadState = 'ready',
    onRetry = vi.fn(),
}: RenderOptions = {}) => render(
    <MemoryRouter>
        <CategorySpendingPanels
            analytics={monthlyAnalytics}
            currency="RUB"
            loadState="ready"
            onRetry={vi.fn()}
            spendingOverTime={spendingOverTime}
            spendingOverTimeLoadState={loadState}
            onRetrySpendingOverTime={onRetry}
        />
    </MemoryRouter>,
)

describe('CategorySpendingPanels', () => {
    it('renders category spending history and localizes the aggregate series', () => {
        renderPanels()

        const chart = screen.getByRole('img', {
            name: 'Category spending over the last six months · RUB',
        })
        expect(chart).toHaveAttribute('data-series', 'Groceries|Other')
        expect(screen.getByText('Groceries', {
            selector: '.category-over-time-legend span',
        })).toBeInTheDocument()
        expect(screen.getByText('Other', {
            selector: '.category-over-time-legend span',
        })).toBeInTheDocument()
        expect(screen.queryByText('Backend Other')).not.toBeInTheDocument()
        expect(document.querySelectorAll('.category-over-time-legend li')).toHaveLength(2)
        expect(document.querySelector('.category-over-time-legend strong')).toBeNull()
    })

    it('shows a loading indicator instead of the former placeholder', () => {
        renderPanels({
            spendingOverTime: null,
            loadState: 'loading',
        })

        expect(screen.getByRole('status'))
            .toHaveTextContent('Loading category history')
        expect(screen.queryByText('Coming soon')).not.toBeInTheDocument()
        expect(screen.queryByText('Category history is on the way'))
            .not.toBeInTheDocument()
    })

    it('allows retrying a failed history request', () => {
        const onRetry = vi.fn()
        renderPanels({
            spendingOverTime: null,
            loadState: 'error',
            onRetry,
        })

        fireEvent.click(screen.getByRole('button', {name: 'Try again'}))

        expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('shows an empty state when category history has no spending', () => {
        renderPanels({
            spendingOverTime: {
                ...trendAnalytics,
                totalSum: 0,
                series: [],
            },
        })

        expect(screen.getByText('No category history yet')).toBeInTheDocument()
        expect(screen.queryByTestId('category-trend-chart')).not.toBeInTheDocument()
    })
})
