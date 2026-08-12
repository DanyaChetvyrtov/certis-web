import {apiRequest} from '../../../shared/api/client'
import type {Currency} from '../../accounts/api/accountsApi'

export type Transfer = {
    id: string
    sourceAccountId: string
    destinationAccountId: string
    reversalOfTransferId?: string | null
    currency: Currency
    amount: number
    note?: string | null
    occurredAt: string
    createdAt: string
}

export type CreateTransferRequest = {
    sourceAccountId: string
    destinationAccountId: string
    amount: number
    note: string | null
    occurredAt: string
}

export type ReverseTransferRequest = {
    note: string | null
    occurredAt: string
}

const TRANSFERS_PATH = '/api/v1/transfers'

const transferPath = (transferId: string): string =>
    `${TRANSFERS_PATH}/${transferId}`

export const getTransfers = (signal?: AbortSignal) =>
    apiRequest<Transfer[]>(TRANSFERS_PATH, {
        signal,
        fallbackMessage: 'We could not load your transfers. Please try again.',
    })

export const getTransfer = (
    transferId: string,
    signal?: AbortSignal,
) => apiRequest<Transfer>(transferPath(transferId), {
    signal,
    fallbackMessage: 'We could not load this transfer. Please try again.',
})

export const createTransfer = (
    request: CreateTransferRequest,
) => apiRequest<Transfer>(TRANSFERS_PATH, {
    method: 'POST',
    body: request,
    fallbackMessage: 'We could not transfer the money. Please try again.',
})

export const reverseTransfer = (
    transferId: string,
    request: ReverseTransferRequest,
) => apiRequest<Transfer>(`${transferPath(transferId)}/reversal`, {
    method: 'POST',
    body: request,
    fallbackMessage: 'We could not reverse this transfer. Please try again.',
})
