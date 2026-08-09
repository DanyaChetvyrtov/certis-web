import {
    fireEvent,
    render,
    screen,
} from '@testing-library/react'
import {
    http,
    HttpResponse,
} from 'msw'
import {MemoryRouter} from 'react-router-dom'
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import {server} from '../../../test/server'
import {CategoriesPage} from './CategoriesPage'

vi.mock('../../auth/session/SessionContext', () => ({
    useSession: () => ({
        profile: {
            id: 'profile-id',
            name: 'Daniel',
            surname: 'Carter',
            dateOfBirth: '2000-01-01',
        },
    }),
}))

const renderPage = () =>
    render(
        <MemoryRouter>
            <CategoriesPage/>
        </MemoryRouter>,
    )

describe('CategoriesPage', () => {
    it('separates active and archived categories', async () => {
        server.use(
            http.get('/api/v1/categories', () => HttpResponse.json([
                {
                    id: 'groceries',
                    name: 'Groceries',
                    type: 'EXPENSE',
                    icon: 'shopping-cart',
                    color: '#E6655A',
                    archivedAt: null,
                },
                {
                    id: 'salary',
                    name: 'Salary',
                    type: 'INCOME',
                    icon: 'briefcase',
                    color: '#10B981',
                    archivedAt: null,
                },
                {
                    id: 'old-expense',
                    name: 'Old expense',
                    type: 'EXPENSE',
                    icon: 'gift',
                    color: '#8C9AB8',
                    archivedAt: '2026-08-08T17:00:00Z',
                },
            ])),
        )

        renderPage()

        expect(
            await screen.findByText('Groceries'),
        ).toBeInTheDocument()

        expect(
            screen.getByRole('tab', {name: 'Expenses · 1'}),
        ).toBeInTheDocument()

        expect(
            screen.getByRole('tab', {name: 'Income · 1'}),
        ).toBeInTheDocument()

        expect(
            screen.queryByText('Old expense'),
        ).not.toBeInTheDocument()

        fireEvent.click(
            screen.getByRole('button', {name: 'Archived · 1'}),
        )

        expect(screen.getByText('Old expense')).toBeInTheDocument()
        expect(screen.queryByText('Groceries')).not.toBeInTheDocument()

        fireEvent.click(
            screen.getByRole('button', {name: 'Active · 2'}),
        )

        fireEvent.click(
            screen.getByRole('tab', {name: 'Income · 1'}),
        )

        expect(screen.getByText('Salary')).toBeInTheDocument()
        expect(screen.queryByText('Groceries')).not.toBeInTheDocument()
    })

    it('creates a category and switches to its type', async () => {
        let requestBody: unknown

        server.use(
            http.get(
                '/api/v1/categories',
                () => HttpResponse.json([]),
            ),
            http.post(
                '/api/v1/categories',
                async ({request}) => {
                    requestBody = await request.json()

                    return HttpResponse.json(
                        {
                            id: 'freelance',
                            name: 'Freelance',
                            type: 'INCOME',
                            icon: 'briefcase',
                            color: '#10B981',
                            archivedAt: null,
                        },
                        {status: 201},
                    )
                },
            ),
        )

        renderPage()

        await screen.findByText('Create your first category')

        fireEvent.click(
            screen.getByRole('button', {name: 'New category'}),
        )

        expect(
            screen.getByRole('dialog', {name: 'New category'}),
        ).toBeInTheDocument()

        fireEvent.change(
            screen.getByLabelText('Name'),
            {target: {value: 'Freelance'}},
        )

        fireEvent.click(
            screen.getByRole('radio', {name: 'Income'}),
        )

        fireEvent.click(
            screen.getByRole('radio', {name: 'Work'}),
        )

        fireEvent.click(
            screen.getByRole('radio', {name: 'Emerald'}),
        )

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Create category',
            }),
        )

        expect(
            await screen.findByText('Category created.'),
        ).toBeInTheDocument()

        expect(
            screen.getByText('Freelance'),
        ).toBeInTheDocument()

        expect(requestBody).toEqual({
            name: 'Freelance',
            type: 'INCOME',
            icon: 'briefcase',
            color: '#10B981',
        })

        expect(
            screen.getByRole('tab', {name: 'Income · 1'}),
        ).toHaveAttribute('aria-selected', 'true')
    })

    it('edits an active category and updates its card', async () => {
        let requestBody: unknown

        server.use(
            http.get('/api/v1/categories', () => HttpResponse.json([
                {
                    id: 'groceries',
                    name: 'Groceries',
                    type: 'EXPENSE',
                    icon: 'shopping-cart',
                    color: '#E6655A',
                    archivedAt: null,
                },
            ])),
            http.put(
                '/api/v1/categories/:categoryId',
                async ({params, request}) => {
                    expect(params.categoryId).toBe('groceries')
                    requestBody = await request.json()

                    return HttpResponse.json({
                        id: 'groceries',
                        name: 'Food',
                        type: 'EXPENSE',
                        icon: 'utensils',
                        color: '#E58E4E',
                        archivedAt: null,
                    })
                },
            ),
        )

        renderPage()

        await screen.findByText('Groceries')

        fireEvent.click(
            screen.getByRole('button', {name: 'Edit Groceries'}),
        )

        expect(
            screen.getByRole('dialog', {name: 'Edit category'}),
        ).toBeInTheDocument()

        fireEvent.change(
            screen.getByLabelText('Name'),
            {target: {value: 'Food'}},
        )
        fireEvent.click(
            screen.getByRole('radio', {name: 'Dining'}),
        )
        fireEvent.click(
            screen.getByRole('radio', {name: 'Orange'}),
        )
        fireEvent.click(
            screen.getByRole('button', {name: 'Save changes'}),
        )

        expect(
            await screen.findByText('Category updated.'),
        ).toBeInTheDocument()
        expect(screen.getByText('Food')).toBeInTheDocument()
        expect(screen.queryByText('Groceries')).not.toBeInTheDocument()
        expect(requestBody).toEqual({
            name: 'Food',
            icon: 'utensils',
            color: '#E58E4E',
        })
    })

    it('archives a category and keeps it available in the archive', async () => {
        let archivedCategoryId = ''

        server.use(
            http.get('/api/v1/categories', () => HttpResponse.json([
                {
                    id: 'groceries',
                    name: 'Groceries',
                    type: 'EXPENSE',
                    icon: 'shopping-cart',
                    color: '#E6655A',
                    archivedAt: null,
                },
            ])),
            http.delete(
                '/api/v1/categories/:categoryId',
                ({params}) => {
                    archivedCategoryId = String(params.categoryId)
                    return new HttpResponse(null, {status: 204})
                },
            ),
        )

        renderPage()

        await screen.findByText('Groceries')

        fireEvent.click(
            screen.getByRole('button', {name: 'Archive Groceries'}),
        )

        expect(
            screen.getByRole('alertdialog', {
                name: 'Archive “Groceries”?',
            }),
        ).toBeInTheDocument()

        fireEvent.click(
            screen.getByRole('button', {name: 'Archive category'}),
        )

        expect(
            await screen.findByText(
                'Category archived. You can restore it from Archived.',
            ),
        ).toBeInTheDocument()
        expect(archivedCategoryId).toBe('groceries')
        expect(screen.queryByText('Groceries')).not.toBeInTheDocument()

        fireEvent.click(
            screen.getByRole('button', {name: 'Archived · 1'}),
        )

        expect(screen.getByText('Groceries')).toBeInTheDocument()
    })

    it('restores an archived category', async () => {
        let restoredCategoryId = ''

        server.use(
            http.get('/api/v1/categories', () => HttpResponse.json([
                {
                    id: 'old-expense',
                    name: 'Old expense',
                    type: 'EXPENSE',
                    icon: 'gift',
                    color: '#8C9AB8',
                    archivedAt: '2026-08-08T17:00:00Z',
                },
            ])),
            http.post(
                '/api/v1/categories/:categoryId/restore',
                ({params}) => {
                    restoredCategoryId = String(params.categoryId)
                    return new HttpResponse(null, {status: 204})
                },
            ),
        )

        renderPage()

        await screen.findByText('Create your first category')

        fireEvent.click(
            screen.getByRole('button', {name: 'Archived · 1'}),
        )
        fireEvent.click(
            screen.getByRole('button', {name: 'Restore Old expense'}),
        )

        expect(
            await screen.findByText('Category restored.'),
        ).toBeInTheDocument()
        expect(restoredCategoryId).toBe('old-expense')
        expect(screen.queryByText('Old expense')).not.toBeInTheDocument()

        fireEvent.click(
            screen.getByRole('button', {name: 'Active · 1'}),
        )

        expect(screen.getByText('Old expense')).toBeInTheDocument()
    })

    it('retries the initial load after an error', async () => {
        let loadAttempts = 0

        server.use(
            http.get('/api/v1/categories', () => {
                loadAttempts += 1

                if (loadAttempts === 1) {
                    return HttpResponse.json(
                        {message: 'Categories are temporarily unavailable.'},
                        {status: 500},
                    )
                }

                return HttpResponse.json([
                    {
                        id: 'groceries',
                        name: 'Groceries',
                        type: 'EXPENSE',
                        icon: 'shopping-cart',
                        color: '#E6655A',
                        archivedAt: null,
                    },
                ])
            }),
        )

        renderPage()

        expect(
            await screen.findByText(
                'Categories are temporarily unavailable.',
            ),
        ).toBeInTheDocument()

        fireEvent.click(
            screen.getByRole('button', {name: 'Try again'}),
        )

        expect(await screen.findByText('Groceries')).toBeInTheDocument()
        expect(loadAttempts).toBe(2)
    })

    it('shows a created category after the initial load failed', async () => {
        server.use(
            http.get(
                '/api/v1/categories',
                () => HttpResponse.json(
                    {message: 'Categories could not be fetched.'},
                    {status: 500},
                ),
            ),
            http.post(
                '/api/v1/categories',
                () => HttpResponse.json(
                    {
                        id: 'recovered',
                        name: 'Recovered',
                        type: 'EXPENSE',
                        icon: 'gift',
                        color: '#E6655A',
                        archivedAt: null,
                    },
                    {status: 201},
                ),
            ),
        )

        renderPage()

        await screen.findByText('Categories could not be fetched.')
        fireEvent.click(
            screen.getByRole('button', {name: 'New category'}),
        )
        fireEvent.change(
            screen.getByLabelText('Name'),
            {target: {value: 'Recovered'}},
        )
        fireEvent.click(
            screen.getByRole('button', {name: 'Create category'}),
        )

        expect(
            await screen.findByText('Category created.'),
        ).toBeInTheDocument()
        expect(screen.getByText('Recovered')).toBeInTheDocument()
        expect(
            screen.queryByText('Categories could not be loaded'),
        ).not.toBeInTheDocument()
    })

    it('keeps an archived category visible when restore fails', async () => {
        server.use(
            http.get('/api/v1/categories', () => HttpResponse.json([
                {
                    id: 'old-expense',
                    name: 'Old expense',
                    type: 'EXPENSE',
                    icon: 'gift',
                    color: '#8C9AB8',
                    archivedAt: '2026-08-08T17:00:00Z',
                },
            ])),
            http.post(
                '/api/v1/categories/:categoryId/restore',
                () => HttpResponse.json(
                    {message: 'This category cannot be restored yet.'},
                    {status: 409},
                ),
            ),
        )

        renderPage()

        await screen.findByText('Create your first category')
        fireEvent.click(
            screen.getByRole('button', {name: 'Archived · 1'}),
        )
        fireEvent.click(
            screen.getByRole('button', {name: 'Restore Old expense'}),
        )

        expect(
            await screen.findByText(
                'This category cannot be restored yet.',
            ),
        ).toBeInTheDocument()
        expect(screen.getByText('Old expense')).toBeInTheDocument()
        expect(
            screen.getByRole('button', {name: 'Restore Old expense'}),
        ).toBeEnabled()
    })
})
