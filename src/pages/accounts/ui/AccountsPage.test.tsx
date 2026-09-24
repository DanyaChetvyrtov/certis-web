import {MemoryRouter} from 'react-router-dom'
import {http, HttpResponse} from 'msw'
import {describe, expect, it, vi} from 'vitest'
import {server} from '../../../test/server'
import {selectOption} from '../../../test/selectOption'
import {AccountsPage} from './AccountsPage'
import {
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react'

vi.mock('../../../features/auth/session/SessionContext', () => ({
    useSession: () => ({
        profile: {
            id: 'profile-id',
            name: 'Daniel',
            surname: 'Carter',
            dateOfBirth: '2000-01-01',
            preferredCurrency: 'RUB',
        },
    }),
}))

const renderPage = () =>
    render(
        <MemoryRouter>
            <AccountsPage/>
        </MemoryRouter>,
    )

describe('AccountsPage', () => {
    it('shows loading, reports a failed request and retries successfully', async () => {
        let calls = 0
        server.use(http.get('/api/v1/accounts', () => {
            calls += 1
            if (calls === 1) return new HttpResponse(null, {status: 503})
            return HttpResponse.json({accounts: [{
                id: 'recovered', name: 'Recovered account', type: 'CARD',
                openingBalance: 0, balance: 50, currency: 'RUB',
                createdAt: '2026-08-01T00:00:00Z',
            }]})
        }))

        renderPage()
        expect(screen.getByLabelText('Loading accounts')).toBeInTheDocument()
        expect(await screen.findByRole('alert')).toHaveTextContent('Accounts could not be loaded')
        fireEvent.click(screen.getByRole('button', {name: 'Try again'}))
        expect(await screen.findByText('Recovered account')).toBeInTheDocument()
        expect(calls).toBe(2)
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('filters, searches, sorts and switches summary currency', async () => {
        server.use(http.get('/api/v1/accounts', () => HttpResponse.json({accounts: [
            {
                id: 'bank', name: 'Zoo bank', type: 'BANK', openingBalance: 0,
                balance: 10, currency: 'RUB', createdAt: '2026-08-01T00:00:00Z',
            },
            {
                id: 'card', name: 'Alpha card', type: 'CARD', openingBalance: 0,
                balance: 200, currency: 'EUR', createdAt: '2026-08-02T00:00:00Z',
            },
            {
                id: 'closed', name: 'Closed cash', type: 'CASH', openingBalance: 0,
                balance: 900, currency: 'RUB', createdAt: '2026-07-01T00:00:00Z',
                closedAt: '2026-08-03T00:00:00Z',
            },
        ]})))

        renderPage()
        await screen.findByText('Alpha card')
        const rowNames = () => Array.from(document.querySelectorAll('.account-row .account-identity strong'))
            .map((element) => element.textContent)
        expect(rowNames()).toEqual(['Alpha card', 'Zoo bank', 'Closed cash'])

        fireEvent.click(screen.getByRole('button', {name: 'Closed · 1'}))
        expect(rowNames()).toEqual(['Closed cash'])
        fireEvent.click(screen.getByRole('button', {name: 'Active · 2'}))
        expect(rowNames()).toEqual(['Alpha card', 'Zoo bank'])

        const search = screen.getByRole('searchbox', {name: 'Search accounts'})
        fireEvent.change(search, {target: {value: 'zoo'}})
        expect(rowNames()).toEqual(['Zoo bank'])
        fireEvent.change(search, {target: {value: 'missing'}})
        expect(screen.getByText('No accounts found')).toBeInTheDocument()
        fireEvent.change(search, {target: {value: ''}})

        await selectOption(screen.getByRole('combobox', {name: 'Sort accounts'}), 'Name')
        expect(rowNames()).toEqual(['Alpha card', 'Zoo bank'])
        await selectOption(screen.getByRole('combobox', {name: 'Sort accounts'}), 'Balance')
        expect(rowNames()).toEqual(['Alpha card', 'Zoo bank'])
        fireEvent.click(screen.getByRole('button', {name: 'All · 3'}))
        expect(rowNames()).toEqual(['Closed cash', 'Alpha card', 'Zoo bank'])

        const summary = screen.getByRole('region', {name: 'Balance summary'})
        expect(summary).toHaveTextContent('₽10')
        await selectOption(screen.getByRole('combobox', {name: 'Summary currency'}), 'EUR')
        expect(summary).toHaveTextContent('€200')
        expect(summary).not.toHaveTextContent('€1,100')
    })

    it('renders real accounts without mixing currencies in the total', async () => {
        server.use(
            http.get('/api/v1/accounts', () => HttpResponse.json({
                accounts: [
                    {
                        id: 'rub-account',
                        name: 'Main card',
                        type: 'CARD',
                        openingBalance: 100,
                        balance: 125.5,
                        currency: 'RUB',
                        createdAt: '2026-08-01T10:00:00Z',
                    },
                    {
                        id: 'eur-account',
                        name: 'Travel cash',
                        type: 'CASH',
                        openingBalance: 900,
                        balance: 900,
                        currency: 'EUR',
                        createdAt: '2026-07-31T10:00:00Z',
                    },
                ],
            })),
        )

        renderPage()

        expect(
            await screen.findByText('Main card'),
        ).toBeInTheDocument()

        expect(
            screen.getByText('Travel cash'),
        ).toBeInTheDocument()

        expect(
            screen.getAllByText('₽126'),
        ).toHaveLength(2)

        expect(
            screen.queryByText('₽1,026'),
        ).not.toBeInTheDocument()
    })

    it('does not offer lifecycle actions for a closed account', async () => {
        server.use(
            http.get('/api/v1/accounts', () => HttpResponse.json({
                accounts: [
                    {
                        id: 'active-account',
                        name: 'Main card',
                        type: 'CARD',
                        openingBalance: 100,
                        balance: 125.5,
                        currency: 'RUB',
                        createdAt: '2026-08-01T10:00:00Z',
                    },
                    {
                        id: 'closed-account',
                        name: 'Archived cash',
                        type: 'CASH',
                        openingBalance: 900,
                        balance: 900,
                        currency: 'RUB',
                        createdAt: '2026-07-01T10:00:00Z',
                        closedAt: '2026-08-01T11:00:00Z',
                    },
                ],
            })),
        )

        renderPage()

        expect(await screen.findByText('Archived cash')).toBeInTheDocument()
        expect(screen.getByRole('button', {name: 'Actions for Main card'})).toBeInTheDocument()
        expect(screen.queryByRole('button', {name: 'Actions for Archived cash'})).not.toBeInTheDocument()
    })

    it('creates an account and adds it to the page', async () => {
        let requestBody: unknown

        server.use(
            http.get(
                '/api/v1/accounts',
                () => HttpResponse.json({accounts: []}),
            ),
            http.post(
                '/api/v1/accounts',
                async ({request}) => {
                    requestBody =
                        await request.json()

                    return HttpResponse.json(
                        {
                            id: 'new-account',
                            name: 'Savings',
                            type: 'CARD',
                            openingBalance: 2500,
                            balance: 2500,
                            currency: 'RUB',
                            createdAt:
                                '2026-08-08T17:00:00Z',
                        },
                        {
                            status: 201,
                        },
                    )
                },
            ),
        )

        renderPage()

        await screen.findByText(
            'Create your first account',
        )

        fireEvent.click(
            screen.getByRole(
                'button',
                {
                    name: 'New account',
                },
            ),
        )

        expect(
            screen.getByRole(
                'dialog',
                {
                    name: 'Create a new account',
                },
            ),
        ).toBeInTheDocument()

        fireEvent.change(
            screen.getByLabelText(
                'Account name',
            ),
            {
                target: {
                    value: 'Savings',
                },
            },
        )

        fireEvent.change(
            screen.getByLabelText(
                'Opening balance',
            ),
            {
                target: {
                    value: '2500',
                },
            },
        )

        fireEvent.click(
            screen.getByRole(
                'button',
                {
                    name: 'Create account',
                },
            ),
        )

        expect(
            await screen.findByText('Savings'),
        ).toBeInTheDocument()

        expect(requestBody).toEqual({
            name: 'Savings',
            type: 'CARD',
            openingBalance: 2500,
            currency: 'RUB',
        })

        expect(
            screen.getByText(
                'Account created.',
            ),
        ).toBeInTheDocument()
    })

    it('edits an account and restores focus to its actions button', async () => {
        let requestBody: unknown

        const originalAccount = {
            id: 'account-id',
            name: 'Main card',
            type: 'CARD',
            openingBalance: 100,
            balance: 125.5,
            currency: 'RUB',
            createdAt:
                '2026-08-01T10:00:00Z',
        }

        server.use(
            http.get(
                '/api/v1/accounts',
                () =>
                    HttpResponse.json({
                        accounts: [originalAccount],
                    }),
            ),
            http.put(
                '/api/v1/accounts/:accountId',
                async ({request}) => {
                    requestBody =
                        await request.json()

                    return HttpResponse.json({
                        ...originalAccount,
                        name: 'Everyday card',
                    })
                },
            ),
        )

        renderPage()

        await screen.findByText(
            'Main card',
        )

        const actionsButton =
            screen.getByRole(
                'button',
                {
                    name: 'Actions for Main card',
                },
            )

        fireEvent.click(actionsButton)

        fireEvent.click(
            screen.getByRole(
                'menuitem',
                {
                    name: 'Edit account',
                },
            ),
        )

        expect(
            screen.getByRole(
                'dialog',
                {
                    name: 'Edit account',
                },
            ),
        ).toBeInTheDocument()

        const nameInput =
            screen.getByLabelText(
                'Account name',
            )

        expect(nameInput).toHaveValue(
            'Main card',
        )

        fireEvent.change(
            nameInput,
            {
                target: {
                    value: 'Everyday card',
                },
            },
        )

        fireEvent.click(
            screen.getByRole(
                'button',
                {
                    name: 'Save changes',
                },
            ),
        )

        expect(
            await screen.findByText(
                'Everyday card',
            ),
        ).toBeInTheDocument()

        expect(requestBody).toEqual({
            name: 'Everyday card',
            type: 'CARD',
            openingBalance: 100,
        })

        expect(
            screen.getByText(
                'Account updated.',
            ),
        ).toBeInTheDocument()

        await waitFor(() => {
            expect(
                actionsButton,
            ).toHaveFocus()
        })
    })

    it('closes an account, reloads it and moves focus to the accounts heading', async () => {
        let isClosed = false
        let deleteCalls = 0

        const activeAccount = {
            id: 'account-id',
            name: 'Main card',
            type: 'CARD',
            openingBalance: 100,
            balance: 125.5,
            currency: 'RUB',
            createdAt:
                '2026-08-01T10:00:00Z',
        }

        server.use(
            http.get(
                '/api/v1/accounts',
                () =>
                    HttpResponse.json({
                        accounts: [
                            isClosed
                                ? {
                                    ...activeAccount,
                                    closedAt:
                                        '2026-08-08T17:00:00Z',
                                }
                                : activeAccount,
                        ],
                    }),
            ),
            http.delete(
                '/api/v1/accounts/:accountId',
                () => {
                    deleteCalls += 1
                    isClosed = true

                    return new HttpResponse(
                        null,
                        {
                            status: 204,
                        },
                    )
                },
            ),
        )

        renderPage()

        await screen.findByText(
            'Main card',
        )

        fireEvent.click(
            screen.getByRole(
                'button',
                {
                    name: 'Actions for Main card',
                },
            ),
        )

        fireEvent.click(
            screen.getByRole(
                'menuitem',
                {
                    name: 'Close account',
                },
            ),
        )

        const dialog =
            screen.getByRole(
                'alertdialog',
                {
                    name: 'Close “Main card”?',
                },
            )

        expect(dialog).toBeInTheDocument()

        const keepButton =
            screen.getByRole(
                'button',
                {
                    name: 'Keep account',
                },
            )

        await waitFor(() => {
            expect(
                keepButton,
            ).toHaveFocus()
        })

        fireEvent.click(
            screen.getByRole(
                'button',
                {
                    name: 'Close account',
                },
            ),
        )

        expect(
            await screen.findByText(
                'Final balance',
            ),
        ).toBeInTheDocument()

        expect(deleteCalls).toBe(1)

        expect(
            screen.queryByRole(
                'button',
                {
                    name: 'Actions for Main card',
                },
            ),
        ).not.toBeInTheDocument()

        expect(
            screen.getByText(
                'Main card was closed.',
            ),
        ).toBeInTheDocument()

        const accountsHeading =
            screen.getByRole(
                'heading',
                {
                    name: 'Your accounts',
                },
            )

        await waitFor(() => {
            expect(
                accountsHeading,
            ).toHaveFocus()
        })
    })
})
