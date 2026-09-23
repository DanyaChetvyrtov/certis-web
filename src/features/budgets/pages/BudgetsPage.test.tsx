import {render, screen, within} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {describe, expect, it, vi} from 'vitest'
import {BudgetsPage} from './BudgetsPage'

vi.mock('../../auth/session/SessionContext', () => ({
    useSession: () => ({
        profile: {
            id: 'profile-id',
            name: 'Daniel',
            surname: 'Carter',
            preferredCurrency: 'RUB',
        },
        profilePhotoRevision: 0,
        refreshProfilePhoto: vi.fn(),
        setProfile: vi.fn(),
        signOut: vi.fn(),
    }),
}))

vi.mock('../api/budgetPlanningApi', () => ({
    getCurrentBudgetPlan: vi.fn(async () => { throw new Error('offline') }),
    createBudgetPlan: vi.fn(),
    getBudgetForecastPreview: vi.fn(),
    confirmBudgetForecast: vi.fn(),
}))

describe('BudgetsPage', () => {
    it('renders the shared workspace navigation while showing a loading failure', async () => {
        render(<MemoryRouter><BudgetsPage/></MemoryRouter>)

        const navigation = screen.getByRole('navigation', {name: 'Workspace navigation'})
        expect(within(navigation).getByRole('link', {name: 'Budgets'}))
            .toHaveAttribute('aria-current', 'page')
        expect(screen.getByRole('heading', {name: 'Budgets'})).toBeInTheDocument()
        expect(await screen.findByRole('alert')).toHaveTextContent('offline')
    })
})
