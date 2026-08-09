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

import {
    server,
} from '../../../test/server'
import type {
    Account,
} from '../api/accountsApi'
import {
    CloseAccountDialog,
} from './CloseAccountDialog'

const account: Account = {
    id: 'account-id',
    name: 'Main card',
    type: 'CARD',
    openingBalance: 100,
    balance: 125.5,
    currency: 'RUB',
    createdAt: '2026-08-01T10:00:00Z',
}

const renderDialog = (
    options: {
        onClosed?: () => Promise<void>
    } = {},
) => {
    const onCancel = vi.fn()
    const onClosed =
        options.onClosed
        ?? vi.fn().mockResolvedValue(undefined)

    const restoreFocus = vi.fn()

    const result = render(
        <CloseAccountDialog
            account={account}
            onCancel={onCancel}
            onClosed={onClosed}
            restoreFocus={restoreFocus}
        />,
    )

    return {
        ...result,
        onCancel,
        onClosed,
        restoreFocus,
    }
}

describe('CloseAccountDialog', () => {
    it('renders an accessible confirmation dialog and focuses Keep account', async () => {
        renderDialog()

        expect(
            screen.getByRole(
                'alertdialog',
                {
                    name: 'Close “Main card”?',
                },
            ),
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                /archived and excluded from your total balance/i,
            ),
        ).toBeInTheDocument()

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
    })

    it('cancels when Keep account is clicked', () => {
        const {
            onCancel,
        } = renderDialog()

        fireEvent.click(
            screen.getByRole(
                'button',
                {
                    name: 'Keep account',
                },
            ),
        )

        expect(
            onCancel,
        ).toHaveBeenCalledOnce()
    })

    it('cancels on Escape while idle', () => {
        const {
            onCancel,
        } = renderDialog()

        fireEvent.keyDown(
            document,
            {
                key: 'Escape',
            },
        )

        expect(
            onCancel,
        ).toHaveBeenCalledOnce()
    })

    it('traps keyboard focus inside the dialog', async () => {
        renderDialog()

        const keepButton =
            screen.getByRole(
                'button',
                {
                    name: 'Keep account',
                },
            )

        const closeButton =
            screen.getByRole(
                'button',
                {
                    name: 'Close account',
                },
            )

        await waitFor(() => {
            expect(
                keepButton,
            ).toHaveFocus()
        })

        fireEvent.keyDown(
            keepButton,
            {
                key: 'Tab',
                shiftKey: true,
            },
        )

        expect(
            closeButton,
        ).toHaveFocus()

        fireEvent.keyDown(
            closeButton,
            {
                key: 'Tab',
            },
        )

        expect(
            keepButton,
        ).toHaveFocus()
    })

    it('closes the account and waits for onClosed', async () => {
        let deleteCalls = 0

        server.use(
            http.delete(
                '/api/v1/accounts/:accountId',
                ({params}) => {
                    expect(
                        params.accountId,
                    ).toBe('account-id')

                    deleteCalls += 1

                    return new HttpResponse(
                        null,
                        {
                            status: 204,
                        },
                    )
                },
            ),
        )

        const {
            onClosed,
        } = renderDialog()

        fireEvent.click(
            screen.getByRole(
                'button',
                {
                    name: 'Close account',
                },
            ),
        )

        await waitFor(() => {
            expect(
                onClosed,
            ).toHaveBeenCalledOnce()
        })

        expect(deleteCalls).toBe(1)
    })

    it('keeps the dialog locked while onClosed is pending', async () => {
        let resolveOnClosed:
            (() => void) | undefined

        const onClosedGate =
            new Promise<void>(
                (resolve) => {
                    resolveOnClosed =
                        resolve
                },
            )

        const onClosed =
            vi.fn(
                () => onClosedGate,
            )

        server.use(
            http.delete(
                '/api/v1/accounts/:accountId',
                () =>
                    new HttpResponse(
                        null,
                        {
                            status: 204,
                        },
                    ),
            ),
        )

        const {
            onCancel,
        } = renderDialog({
            onClosed,
        })

        fireEvent.click(
            screen.getByRole(
                'button',
                {
                    name: 'Close account',
                },
            ),
        )

        const closingButton =
            await screen.findByRole(
                'button',
                {
                    name: 'Closing…',
                },
            )

        expect(
            closingButton,
        ).toBeDisabled()

        expect(
            screen.getByRole(
                'button',
                {
                    name: 'Keep account',
                },
            ),
        ).toBeDisabled()

        await waitFor(() => {
            expect(
                onClosed,
            ).toHaveBeenCalledOnce()
        })

        fireEvent.keyDown(
            document,
            {
                key: 'Escape',
            },
        )

        expect(
            onCancel,
        ).not.toHaveBeenCalled()

        resolveOnClosed?.()

        await waitFor(() => {
            expect(
                screen.getByRole(
                    'button',
                    {
                        name: 'Close account',
                    },
                ),
            ).toBeEnabled()
        })
    })

    it('shows an API error and allows retrying', async () => {
        const {
            onClosed,
        } = renderDialog()

        server.use(
            http.delete(
                '/api/v1/accounts/:accountId',
                () =>
                    HttpResponse.json(
                        {
                            message:
                                'Account cannot be closed while it has pending operations.',
                        },
                        {
                            status: 409,
                        },
                    ),
            ),
        )

        fireEvent.click(
            screen.getByRole(
                'button',
                {
                    name: 'Close account',
                },
            ),
        )

        expect(
            await screen.findByRole(
                'alert',
            ),
        ).toHaveTextContent(
            'Account cannot be closed while it has pending operations.',
        )

        expect(
            onClosed,
        ).not.toHaveBeenCalled()

        expect(
            screen.getByRole(
                'button',
                {
                    name: 'Keep account',
                },
            ),
        ).toBeEnabled()

        expect(
            screen.getByRole(
                'button',
                {
                    name: 'Close account',
                },
            ),
        ).toBeEnabled()
    })

    it('restores focus when the dialog unmounts', () => {
        const {
            restoreFocus,
            unmount,
        } = renderDialog()

        unmount()

        expect(
            restoreFocus,
        ).toHaveBeenCalledOnce()
    })
})
