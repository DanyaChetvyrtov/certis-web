import {apiRequest} from '../../../shared/api/client'
import type {Currency} from '../../accounts/api/accountsApi'
import i18n from '../../../i18n/i18n'

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

type TransfersResponse = {
    transfers: Transfer[]
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
    apiRequest<TransfersResponse>(TRANSFERS_PATH, {
        signal,
        fallbackMessage: i18n.t('transactions.api.transfersLoad'),
    }).then((response) => response.transfers)

export const getTransfer = (
    transferId: string,
    signal?: AbortSignal,
) => apiRequest<Transfer>(transferPath(transferId), {
    signal,
    fallbackMessage: i18n.t('transactions.api.transferLoad'),
})

export const createTransfer = (
    request: CreateTransferRequest,
) => apiRequest<Transfer>(TRANSFERS_PATH, {
    method: 'POST',
    body: request,
    fallbackMessage: i18n.t('transactions.api.transferCreate'),
})

export const reverseTransfer = (
    transferId: string,
    request: ReverseTransferRequest,
) => apiRequest<Transfer>(`${transferPath(transferId)}/reversal`, {
    method: 'POST',
    body: request,
    fallbackMessage: i18n.t('transactions.api.transferReverse'),
})
