import { apiRequest } from '../../../shared/api/client'
import {currencies} from '../../../shared/currency'
import type {Currency} from '../../../shared/currency'

export const accountTypes = ['CASH', 'BANK', 'CARD', 'INVESTMENT'] as const
export {currencies}
export type {Currency}

export type AccountType = (typeof accountTypes)[number]
export type AccountCurrency = Currency

export type Account = {
  id: string
  name: string
  type: AccountType
  openingBalance: number
  balance: number
  currency: AccountCurrency
  createdAt: string
  closedAt?: string | null
}

export type CreateAccountRequest = {
  name: string
  type: AccountType
  openingBalance: number
  currency: AccountCurrency
}

export type UpdateAccountRequest = Omit<CreateAccountRequest, 'currency'>

export const accountTypeLabels: Record<AccountType, string> = {
  CASH: 'Cash',
  BANK: 'Bank account',
  CARD: 'Card',
  INVESTMENT: 'Investment',
}

const accountPath = (accountId: string) => `/api/v1/accounts/${accountId}`

export const getAccounts = () =>
  apiRequest<Account[]>('/api/v1/accounts', {
    fallbackMessage: 'We could not load your accounts. Please try again.',
  })

export const getAccount = (accountId: string) =>
  apiRequest<Account>(accountPath(accountId), {
    fallbackMessage: 'We could not load this account. Please try again.',
  })

export const createAccount = (request: CreateAccountRequest) =>
  apiRequest<Account>('/api/v1/accounts', {
    method: 'POST',
    body: request,
    fallbackMessage: 'We could not create this account. Please try again.',
  })

export const updateAccount = (
  accountId: string,
  request: UpdateAccountRequest,
) =>
  apiRequest<Account>(accountPath(accountId), {
    method: 'PUT',
    body: request,
    fallbackMessage: 'We could not update this account. Please try again.',
  })

export const closeAccount = (accountId: string) =>
  apiRequest(accountPath(accountId), {
    method: 'DELETE',
    fallbackMessage: 'We could not close this account. Please try again.',
  })
