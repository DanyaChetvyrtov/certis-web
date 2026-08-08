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
    AccountFormModal,
} from './AccountFormModal'

const editingAccount: Account = {
    id: 'account-id',
    name: 'Main card',
    type: 'CARD',
    openingBalance: 100,
    balance: 125.5,
    currency: 'RUB',
    createdAt: '2026-08-01T10:00:00Z',
}

const createdAccount: Account = {
    id: 'created-account',
    name: 'Savings',
    type: 'CASH',
    openingBalance: 2500,
    balance: 2500,
    currency: 'EUR',
    createdAt: '2026-08-08T17:00:00Z',
}

const renderModal = (
    account?: Account,
) => {
    const onClose = vi.fn()
    const onSaved = vi.fn()
    const restoreFocus = vi.fn()

    const result = render(
        <AccountFormModal
            account={account}
            onClose={onClose}
            onSaved={onSaved}
            restoreFocus={restoreFocus}
        />,
    )

    return {
        ...result,
        onClose,
        onSaved,
        restoreFocus,
    }
}

describe('AccountFormModal', () => {
    it('focuses the account name when the modal opens', async () => {
        renderModal()

        const nameInput =
            screen.getByLabelText(
                'Account name',
            )

        await waitFor(() => {
            expect(nameInput).toHaveFocus()
        })
    })

    it('shows client validation errors and focuses the first invalid field', () => {
        let postCalls = 0

        server.use(
            http.post(
                '/api/v1/accounts',
                () => {
                    postCalls += 1

                    return HttpResponse.json(
                        createdAccount,
                        {
                            status: 201,
                        },
                    )
                },
            ),
        )

        renderModal()

        const nameInput =
            screen.getByLabelText(
                'Account name',
            )

        const openingBalanceInput =
            screen.getByLabelText(
                'Opening balance',
            )

        fireEvent.change(
            nameInput,
            {
                target: {
                    value: '   ',
                },
            },
        )

        fireEvent.change(
            openingBalanceInput,
            {
                target: {
                    value: '100.12345',
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
            screen.getByText(
                'Enter an account name.',
            ),
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'Use up to 15 digits and 4 decimal places.',
            ),
        ).toBeInTheDocument()

        expect(nameInput).toHaveFocus()
        expect(nameInput).toHaveAttribute(
            'aria-invalid',
            'true',
        )
        expect(nameInput).toHaveAttribute(
            'aria-describedby',
            'account-name-error',
        )

        expect(
            openingBalanceInput,
        ).toHaveAttribute(
            'aria-invalid',
            'true',
        )

        expect(
            openingBalanceInput,
        ).toHaveAttribute(
            'aria-describedby',
            'account-opening-balance-error',
        )

        expect(postCalls).toBe(0)
    })

    it('focuses opening balance when it is the first invalid field', () => {
        renderModal()

        const nameInput =
            screen.getByLabelText(
                'Account name',
            )

        const openingBalanceInput =
            screen.getByLabelText(
                'Opening balance',
            )

        fireEvent.change(
            nameInput,
            {
                target: {
                    value: 'Savings',
                },
            },
        )

        fireEvent.change(
            openingBalanceInput,
            {
                target: {
                    value: 'invalid',
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
            screen.queryByText(
                'Enter an account name.',
            ),
        ).not.toBeInTheDocument()

        expect(
            screen.getByText(
                'Use up to 15 digits and 4 decimal places.',
            ),
        ).toBeInTheDocument()

        expect(
            openingBalanceInput,
        ).toHaveFocus()
    })

    it('maps backend field errors and focuses the first invalid field', async () => {
        server.use(
            http.post(
                '/api/v1/accounts',
                () =>
                    HttpResponse.json(
                        {
                            message:
                                'Validation failed.',
                            errors: {
                                name:
                                    'Account name is already used.',
                                openingBalance:
                                    'Opening balance is not allowed.',
                            },
                        },
                        {
                            status: 400,
                        },
                    ),
            ),
        )

        renderModal()

        const nameInput =
            screen.getByLabelText(
                'Account name',
            )

        const openingBalanceInput =
            screen.getByLabelText(
                'Opening balance',
            )

        fireEvent.change(
            nameInput,
            {
                target: {
                    value: 'Savings',
                },
            },
        )

        fireEvent.change(
            openingBalanceInput,
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
            await screen.findByText(
                'Validation failed.',
            ),
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'Account name is already used.',
            ),
        ).toBeInTheDocument()

        expect(
            screen.getByText(
                'Opening balance is not allowed.',
            ),
        ).toBeInTheDocument()

        expect(nameInput).toHaveFocus()

        expect(nameInput).toHaveAttribute(
            'aria-describedby',
            'account-name-error',
        )

        expect(
            openingBalanceInput,
        ).toHaveAttribute(
            'aria-describedby',
            'account-opening-balance-error',
        )
    })

    it('creates an account with currency in the request', async () => {
        let requestBody: unknown

        server.use(
            http.post(
                '/api/v1/accounts',
                async ({request}) => {
                    requestBody =
                        await request.json()

                    return HttpResponse.json(
                        createdAccount,
                        {
                            status: 201,
                        },
                    )
                },
            ),
        )

        const {
            onSaved,
        } = renderModal()

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

        fireEvent.click(
            screen.getByRole(
                'radio',
                {
                    name: 'Cash',
                },
            ),
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

        fireEvent.change(
            screen.getByLabelText(
                'Currency',
            ),
            {
                target: {
                    value: 'EUR',
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

        await waitFor(() => {
            expect(
                onSaved,
            ).toHaveBeenCalledOnce()
        })

        expect(requestBody).toEqual({
            name: 'Savings',
            type: 'CASH',
            openingBalance: 2500,
            currency: 'EUR',
        })

        expect(
            onSaved,
        ).toHaveBeenCalledWith(
            createdAccount,
        )
    })

    it('updates an account without sending currency and keeps currency disabled', async () => {
        let requestBody: unknown

        const updatedAccount: Account = {
            ...editingAccount,
            name: 'Everyday card',
            openingBalance: 200,
        }

        server.use(
            http.put(
                '/api/v1/accounts/:accountId',
                async ({request}) => {
                    requestBody =
                        await request.json()

                    return HttpResponse.json(
                        updatedAccount,
                    )
                },
            ),
        )

        const {
            onSaved,
        } = renderModal(
            editingAccount,
        )

        expect(
            screen.getByRole(
                'dialog',
                {
                    name: 'Edit account',
                },
            ),
        ).toBeInTheDocument()

        const currencySelect =
            screen.getByLabelText(
                'Currency',
            )

        expect(
            currencySelect,
        ).toHaveAttribute(
            'aria-describedby',
            'account-currency-hint',
        )

        expect(
            screen.getByText(
                'Currency cannot be changed.',
            ),
        ).toHaveAttribute(
            'id',
            'account-currency-hint',
        )

        expect(
            currencySelect,
        ).toBeDisabled()

        expect(
            currencySelect,
        ).toHaveValue('RUB')

        fireEvent.change(
            screen.getByLabelText(
                'Account name',
            ),
            {
                target: {
                    value: 'Everyday card',
                },
            },
        )

        fireEvent.change(
            screen.getByLabelText(
                'Opening balance',
            ),
            {
                target: {
                    value: '200',
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

        await waitFor(() => {
            expect(
                onSaved,
            ).toHaveBeenCalledOnce()
        })

        expect(requestBody).toEqual({
            name: 'Everyday card',
            type: 'CARD',
            openingBalance: 200,
        })

        expect(
            onSaved,
        ).toHaveBeenCalledWith(
            updatedAccount,
        )
    })

    it('closes on Escape while idle', () => {
        const {
            onClose,
        } = renderModal()

        fireEvent.keyDown(
            document,
            {
                key: 'Escape',
            },
        )

        expect(
            onClose,
        ).toHaveBeenCalledOnce()
    })

    it('traps keyboard focus inside the modal', async () => {
        renderModal()

        const closeButton =
            screen.getByRole(
                'button',
                {
                    name: 'Close account form',
                },
            )

        const submitButton =
            screen.getByRole(
                'button',
                {
                    name: 'Create account',
                },
            )

        closeButton.focus()

        expect(
            closeButton,
        ).toHaveFocus()

        fireEvent.keyDown(
            closeButton,
            {
                key: 'Tab',
                shiftKey: true,
            },
        )

        expect(
            submitButton,
        ).toHaveFocus()

        fireEvent.keyDown(
            submitButton,
            {
                key: 'Tab',
            },
        )

        expect(
            closeButton,
        ).toHaveFocus()
    })

    it('prevents closing while save is pending', async () => {
        let releaseRequest:
            (() => void) | undefined

        const requestGate =
            new Promise<void>(
                (resolve) => {
                    releaseRequest =
                        resolve
                },
            )

        server.use(
            http.post(
                '/api/v1/accounts',
                async () => {
                    await requestGate

                    return HttpResponse.json(
                        {
                            ...createdAccount,
                            name: 'Savings',
                            type: 'CARD',
                            currency: 'RUB',
                        },
                        {
                            status: 201,
                        },
                    )
                },
            ),
        )

        const {
            onClose,
            onSaved,
        } = renderModal()

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

        const savingButton =
            await screen.findByRole(
                'button',
                {
                    name: 'Saving…',
                },
            )

        expect(
            savingButton,
        ).toBeDisabled()

        expect(
            screen.getByRole(
                'button',
                {
                    name: 'Cancel',
                },
            ),
        ).toBeDisabled()

        expect(
            screen.getByRole(
                'button',
                {
                    name: 'Close account form',
                },
            ),
        ).toBeDisabled()

        fireEvent.keyDown(
            document,
            {
                key: 'Escape',
            },
        )

        expect(
            onClose,
        ).not.toHaveBeenCalled()

        releaseRequest?.()

        await waitFor(() => {
            expect(
                onSaved,
            ).toHaveBeenCalledOnce()
        })
    })
})