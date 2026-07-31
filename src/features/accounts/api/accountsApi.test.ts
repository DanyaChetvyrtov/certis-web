import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/server'
import { getAccounts } from './accountsApi'

describe('accountsApi', () => {
  it('loads the accounts owned by the authenticated user', async () => {
    const accounts = [
      {
        id: 'account-id',
        name: 'Main card',
        type: 'CARD' as const,
        openingBalance: 25_000,
        balance: 25_000,
        currency: 'RUB' as const,
        createdAt: '2026-07-31T12:00:00Z',
      },
    ]

    server.use(
      http.get('/api/v1/accounts', () => HttpResponse.json(accounts)),
    )

    await expect(getAccounts()).resolves.toEqual(accounts)
  })
})
