import {
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react'
import {
    http,
    HttpResponse,
} from 'msw'
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import {server} from '../../../test/server'
import {
    CategoryFormModal,
} from './CategoryFormModal'

const createdCategory = {
    id: 'new-category',
    name: 'Freelance',
    type: 'INCOME',
    icon: 'briefcase',
    color: '#10B981',
    archivedAt: null,
}

const existingCategory = {
    id: 'groceries',
    name: 'Groceries',
    type: 'EXPENSE' as const,
    icon: 'shopping-cart',
    color: '#E6655A',
    archivedAt: null,
}

const renderModal = (
    category?: typeof existingCategory,
) => {
    const onClose = vi.fn()
    const onSaved = vi.fn()
    const restoreFocus = vi.fn()

    render(
        <CategoryFormModal
            category={category}
            onClose={onClose}
            onSaved={onSaved}
            restoreFocus={restoreFocus}
        />,
    )

    return {
        onClose,
        onSaved,
        restoreFocus,
    }
}

describe('CategoryFormModal', () => {
    it('focuses the category name when opened', async () => {
        renderModal()

        const nameInput =
            screen.getByLabelText('Name')

        await waitFor(() => {
            expect(nameInput).toHaveFocus()
        })
    })

    it('validates a blank name without sending a request', () => {
        let postCalls = 0

        server.use(
            http.post('/api/v1/categories', () => {
                postCalls += 1
                return HttpResponse.json(
                    createdCategory,
                    {status: 201},
                )
            }),
        )

        renderModal()

        fireEvent.change(
            screen.getByLabelText('Name'),
            {target: {value: '   '}},
        )

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Create category',
            }),
        )

        expect(
            screen.getByText('Enter a category name.'),
        ).toBeInTheDocument()

        expect(
            screen.getByLabelText('Name'),
        ).toHaveFocus()

        expect(postCalls).toBe(0)
    })

    it('creates an income category with the selected icon and color', async () => {
        let requestBody: unknown

        server.use(
            http.post(
                '/api/v1/categories',
                async ({request}) => {
                    requestBody = await request.json()

                    return HttpResponse.json(
                        createdCategory,
                        {status: 201},
                    )
                },
            ),
        )

        const {onSaved} = renderModal()

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

        await waitFor(() => {
            expect(onSaved).toHaveBeenCalledOnce()
        })

        expect(requestBody).toEqual({
            name: 'Freelance',
            type: 'INCOME',
            icon: 'briefcase',
            color: '#10B981',
        })

        expect(onSaved).toHaveBeenCalledWith(
            createdCategory,
        )
    })

    it('updates an existing category without changing its type', async () => {
        let requestBody: unknown

        const updatedCategory = {
            ...existingCategory,
            name: 'Food',
            icon: 'utensils',
            color: '#E58E4E',
        }

        server.use(
            http.put(
                '/api/v1/categories/:categoryId',
                async ({params, request}) => {
                    expect(params.categoryId).toBe(
                        existingCategory.id,
                    )
                    requestBody = await request.json()

                    return HttpResponse.json(updatedCategory)
                },
            ),
        )

        const {onSaved} = renderModal(existingCategory)

        expect(
            screen.getByRole('dialog', {
                name: 'Edit category',
            }),
        ).toBeInTheDocument()
        expect(screen.getByLabelText('Name')).toHaveValue(
            existingCategory.name,
        )
        expect(
            screen.getByRole('radio', {name: 'Expense'}),
        ).toBeDisabled()

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

        await waitFor(() => {
            expect(onSaved).toHaveBeenCalledWith(updatedCategory)
        })

        expect(requestBody).toEqual({
            name: 'Food',
            icon: 'utensils',
            color: '#E58E4E',
        })
    })

    it('preserves an unknown icon when no replacement is selected', async () => {
        let requestBody: unknown
        const categoryWithUnknownIcon = {
            ...existingCategory,
            icon: 'custom-star',
        }

        server.use(
            http.put(
                '/api/v1/categories/:categoryId',
                async ({request}) => {
                    requestBody = await request.json()
                    return HttpResponse.json(
                        categoryWithUnknownIcon,
                    )
                },
            ),
        )

        const {onSaved} = renderModal(
            categoryWithUnknownIcon,
        )

        expect(
            screen.getByText(
                /This icon is not available in the current set/,
            ),
        ).toBeInTheDocument()

        fireEvent.click(
            screen.getByRole('button', {name: 'Save changes'}),
        )

        await waitFor(() => {
            expect(onSaved).toHaveBeenCalledWith(
                categoryWithUnknownIcon,
            )
        })
        expect(requestBody).toEqual({
            name: existingCategory.name,
            icon: 'custom-star',
            color: existingCategory.color,
        })
    })

    it('shows a create error and keeps the form open', async () => {
        server.use(
            http.post(
                '/api/v1/categories',
                () => HttpResponse.json(
                    {
                        message: 'A category with this name already exists.',
                    },
                    {status: 409},
                ),
            ),
        )

        const {onSaved} = renderModal()

        fireEvent.change(
            screen.getByLabelText('Name'),
            {target: {value: 'Groceries'}},
        )
        fireEvent.click(
            screen.getByRole('button', {name: 'Create category'}),
        )

        expect(
            await screen.findByText(
                'A category with this name already exists.',
            ),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('dialog', {name: 'New category'}),
        ).toBeInTheDocument()
        expect(onSaved).not.toHaveBeenCalled()
    })

    it('shows a field error returned while updating', async () => {
        server.use(
            http.put(
                '/api/v1/categories/:categoryId',
                () => HttpResponse.json(
                    {
                        message: 'Review the highlighted fields.',
                        errors: {
                            name: 'Name is already in use.',
                        },
                    },
                    {status: 400},
                ),
            ),
        )

        const {onSaved} = renderModal(existingCategory)

        fireEvent.click(
            screen.getByRole('button', {name: 'Save changes'}),
        )

        expect(
            await screen.findByText('Name is already in use.'),
        ).toBeInTheDocument()
        expect(screen.getByLabelText('Name')).toHaveFocus()
        expect(onSaved).not.toHaveBeenCalled()
    })
})
