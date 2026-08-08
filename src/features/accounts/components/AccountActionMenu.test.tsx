import {
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react'
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest'

import type {
    Account,
} from '../api/accountsApi'
import {
    AccountActionMenu,
} from './AccountActionMenu'

const account: Account = {
    id: 'account-id',
    name: 'Main card',
    type: 'CARD',
    openingBalance: 100,
    balance: 125.5,
    currency: 'RUB',
    createdAt: '2026-08-01T10:00:00Z',
}

const renderMenu = () => {
    const fallbackRestoreFocus = vi.fn()
    const onEdit = vi.fn()
    const onCloseAccount = vi.fn()

    const result = render(
        <AccountActionMenu
            account={account}
            fallbackRestoreFocus={
                fallbackRestoreFocus
            }
            onEdit={onEdit}
            onCloseAccount={
                onCloseAccount
            }
        />,
    )

    return {
        ...result,
        fallbackRestoreFocus,
        onEdit,
        onCloseAccount,
    }
}

describe('AccountActionMenu', () => {
    it('opens the menu and focuses the first action', async () => {
        renderMenu()

        const trigger = screen.getByRole(
            'button',
            {
                name: 'Actions for Main card',
            },
        )

        fireEvent.click(trigger)

        const menu = screen.getByRole(
            'menu',
            {
                name: 'Actions for Main card',
            },
        )

        const editAction =
            screen.getByRole(
                'menuitem',
                {
                    name: 'Edit account',
                },
            )

        expect(menu).toBeInTheDocument()
        expect(trigger).toHaveAttribute(
            'aria-expanded',
            'true',
        )

        await waitFor(() => {
            expect(editAction).toHaveFocus()
        })
    })

    it('navigates menu actions with keyboard', async () => {
        renderMenu()

        fireEvent.click(
            screen.getByRole(
                'button',
                {
                    name: 'Actions for Main card',
                },
            ),
        )

        const editAction =
            screen.getByRole(
                'menuitem',
                {
                    name: 'Edit account',
                },
            )

        const closeAction =
            screen.getByRole(
                'menuitem',
                {
                    name: 'Close account',
                },
            )

        await waitFor(() => {
            expect(editAction).toHaveFocus()
        })

        fireEvent.keyDown(
            editAction,
            {
                key: 'ArrowDown',
            },
        )

        expect(closeAction).toHaveFocus()

        fireEvent.keyDown(
            closeAction,
            {
                key: 'ArrowDown',
            },
        )

        expect(editAction).toHaveFocus()

        fireEvent.keyDown(
            editAction,
            {
                key: 'End',
            },
        )

        expect(closeAction).toHaveFocus()

        fireEvent.keyDown(
            closeAction,
            {
                key: 'Home',
            },
        )

        expect(editAction).toHaveFocus()
    })

    it('closes on Escape and restores focus to the trigger', async () => {
        renderMenu()

        const trigger = screen.getByRole(
            'button',
            {
                name: 'Actions for Main card',
            },
        )

        fireEvent.click(trigger)

        const editAction =
            screen.getByRole(
                'menuitem',
                {
                    name: 'Edit account',
                },
            )

        await waitFor(() => {
            expect(editAction).toHaveFocus()
        })

        fireEvent.keyDown(
            editAction,
            {
                key: 'Escape',
            },
        )

        expect(
            screen.queryByRole('menu'),
        ).not.toBeInTheDocument()

        expect(trigger).toHaveFocus()
        expect(trigger).toHaveAttribute(
            'aria-expanded',
            'false',
        )
    })

    it('closes on outside pointer interaction', () => {
        renderMenu()

        fireEvent.click(
            screen.getByRole(
                'button',
                {
                    name: 'Actions for Main card',
                },
            ),
        )

        expect(
            screen.getByRole('menu'),
        ).toBeInTheDocument()

        fireEvent.pointerDown(
            document.body,
        )

        expect(
            screen.queryByRole('menu'),
        ).not.toBeInTheDocument()
    })

    it('passes account and focus restoration callback when editing', () => {
        const {
            onEdit,
        } = renderMenu()

        const trigger = screen.getByRole(
            'button',
            {
                name: 'Actions for Main card',
            },
        )

        fireEvent.click(trigger)

        fireEvent.click(
            screen.getByRole(
                'menuitem',
                {
                    name: 'Edit account',
                },
            ),
        )

        expect(onEdit).toHaveBeenCalledOnce()
        expect(
            onEdit.mock.calls[0][0],
        ).toEqual(account)

        const restoreFocus =
            onEdit.mock.calls[0][1]

        restoreFocus()

        expect(trigger).toHaveFocus()
    })

    it('uses fallback focus when the trigger no longer exists', () => {
        const {
            fallbackRestoreFocus,
            onCloseAccount,
            unmount,
        } = renderMenu()

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

        const restoreFocus =
            onCloseAccount.mock.calls[0][1]

        unmount()

        restoreFocus()

        expect(
            fallbackRestoreFocus,
        ).toHaveBeenCalledOnce()
    })
})
