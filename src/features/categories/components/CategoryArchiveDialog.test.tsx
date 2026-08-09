import {
    fireEvent,
    render,
    screen,
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
    CategoryArchiveDialog,
} from './CategoryArchiveDialog'

const category = {
    id: 'groceries',
    name: 'Groceries',
    type: 'EXPENSE' as const,
    icon: 'shopping-cart',
    color: '#E6655A',
    archivedAt: null,
}

describe('CategoryArchiveDialog', () => {
    it('shows an archive error and leaves the dialog actionable', async () => {
        server.use(
            http.delete(
                '/api/v1/categories/:categoryId',
                () => HttpResponse.json(
                    {
                        message: 'This category is still required.',
                    },
                    {status: 409},
                ),
            ),
        )

        const onArchived = vi.fn()

        render(
            <CategoryArchiveDialog
                category={category}
                onArchived={onArchived}
                onCancel={vi.fn()}
            />,
        )

        fireEvent.click(
            screen.getByRole('button', {name: 'Archive category'}),
        )

        expect(
            await screen.findByText('This category is still required.'),
        ).toBeInTheDocument()
        expect(onArchived).not.toHaveBeenCalled()
        expect(
            screen.getByRole('button', {name: 'Archive category'}),
        ).toBeEnabled()
    })
})
