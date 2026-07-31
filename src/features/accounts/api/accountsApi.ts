import { apiRequest } from '../../../shared/api/client'

export type AccountType = 'CASH' | 'BANK' | 'CARD' | 'INVESTMENT'
export type AccountCurrency = 'RUB' | 'EUR' | 'USD'

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

export const getAccounts = () =>
  apiRequest<Account[]>('/api/v1/accounts', {
    fallbackMessage: 'We could not load your accounts. Please try again.',
  })
