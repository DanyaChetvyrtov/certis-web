import {fireEvent, render, screen, within} from '@testing-library/react'
import {http, HttpResponse} from 'msw'
import {describe, expect, it, vi} from 'vitest'
import {server} from '../../../test/server'
import type {Account} from '../../accounts/api/accountsApi'
import type {Category} from '../../categories/api/categoriesApi'
import {RecurringTransactionsView} from './RecurringTransactionsView'

const account: Account = {
    id: 'main-card',
    name: 'Main card',
    type: 'CARD',
    currency: 'RUB',
    openingBalance: 100000,
    balance: 100000,
    createdAt: '2026-08-01T10:00:00Z',
    closedAt: null,
}

const category: Category = {
    id: 'housing',
    name: 'Housing',
    type: 'EXPENSE',
    icon: 'home',
    color: '#B58C50',
    archivedAt: null,
}

const recurring = {
    id: 'rent-id',
    accountId: account.id,
    categoryId: category.id,
    name: 'Apartment rent',
    type: 'EXPENSE',
    amount: 35000,
    merchant: 'Landlord',
    note: null,
    status: 'ACTIVE',
    frequency: 'MONTHLY',
    intervalCount: 1,
    startDate: '2026-08-01',
    endDate: null,
    lastRunDate: '2026-08-01',
    nextRunDate: '2026-09-01',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
}

const useHandlers = (items: unknown[] = [recurring]) => {
    server.use(
        http.get('/api/v1/accounts', () => HttpResponse.json([account])),
        http.get('/api/v1/categories', () => HttpResponse.json([category])),
        http.get('/api/v1/transactions', () => HttpResponse.json({items: [], page: 0, size: 100, totalElements: 0, totalPages: 0})),
        http.get('/api/v1/recurring-transactions', () => HttpResponse.json(items)),
    )
}

const renderPage = () => render(
    <RecurringTransactionsView
        accounts={[account]}
        categories={[category]}
        onHistory={vi.fn()}
    />,
)

describe('RecurringTransactionsView', () => {
    it('loads schedules and pauses an active recurring transaction', async () => {
        let updateBody: unknown
        useHandlers()
        server.use(http.put('/api/v1/recurring-transactions/:id', async ({request}) => {
            updateBody = await request.json()
            return HttpResponse.json({...recurring, status: 'PAUSED'})
        }))

        renderPage()

        expect((await screen.findAllByText('Apartment rent')).length).toBeGreaterThan(0)
        expect(screen.getByText('Housing · Main card')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', {name: 'Pause Apartment rent'}))

        expect(await screen.findByText('Schedule paused.')).toBeInTheDocument()
        expect(updateBody).toMatchObject({status: 'PAUSED', frequency: 'MONTHLY', intervalCount: 1})
    })

    it('creates a schedule using the current API contract', async () => {
        let requestBody: unknown
        useHandlers([])
        server.use(http.post('/api/v1/recurring-transactions', async ({request}) => {
            requestBody = await request.json()
            return HttpResponse.json(recurring, {status: 201})
        }))

        renderPage()
        await screen.findByText('No recurring transactions yet')
        fireEvent.click(screen.getByRole('button', {name: 'New recurring'}))

        const dialog = within(screen.getByRole('dialog', {name: 'New recurring transaction'}))
        fireEvent.change(dialog.getByLabelText('Name'), {target: {value: 'Apartment rent'}})
        fireEvent.change(dialog.getByLabelText('Amount'), {target: {value: '35000'}})
        fireEvent.change(dialog.getByLabelText('Account'), {target: {value: account.id}})
        fireEvent.change(dialog.getByLabelText('Category'), {target: {value: category.id}})
        fireEvent.change(dialog.getByLabelText('First occurrence'), {target: {value: '2026-09-01'}})
        fireEvent.click(dialog.getByRole('button', {name: 'Create schedule'}))

        expect(await screen.findByText('Schedule created.')).toBeInTheDocument()
        expect(requestBody).toEqual({
            accountId: account.id,
            categoryId: category.id,
            name: 'Apartment rent',
            type: 'EXPENSE',
            amount: 35000,
            merchant: null,
            note: null,
            frequency: 'MONTHLY',
            intervalCount: 1,
            startDate: '2026-09-01',
            endDate: null,
        })
    })
})
