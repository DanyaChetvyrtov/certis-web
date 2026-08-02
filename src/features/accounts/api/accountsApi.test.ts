import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/server'
import {
  closeAccount,
  createAccount,
  getAccount,
  getAccounts,
  updateAccount,
} from './accountsApi'

const account = {
  id: 'account-id',
  name: 'Main card',
  type: 'CARD' as const,
  openingBalance: 100,
  balance: 125.5,
  currency: 'RUB' as const,
  createdAt: '2026-08-01T10:00:00Z',
}

describe('accountsApi', () => {
  it('loads all accounts for the authenticated user', async () => {
    server.use(
      http.get('/api/v1/accounts', () => HttpResponse.json([account])),
    )

    await expect(getAccounts()).resolves.toEqual([account])
  })

  it('loads one account by id', async () => {
    server.use(
      http.get('/api/v1/accounts/:accountId', ({ params }) => {
        expect(params.accountId).toBe(account.id)
        return HttpResponse.json(account)
      }),
    )

    await expect(getAccount(account.id)).resolves.toEqual(account)
  })

  it('creates an account using the backend contract', async () => {
    server.use(
      http.post('/api/v1/accounts', async ({ request }) => {
        await expect(request.json()).resolves.toEqual({
          name: account.name,
          type: account.type,
          openingBalance: account.openingBalance,
          currency: account.currency,
        })
        return HttpResponse.json(account, { status: 201 })
      }),
    )

    await expect(createAccount({
      name: account.name,
      type: account.type,
      openingBalance: account.openingBalance,
      currency: account.currency,
    })).resolves.toEqual(account)
  })

  it('updates editable account fields without sending currency', async () => {
    server.use(
      http.put('/api/v1/accounts/:accountId', async ({ request }) => {
        await expect(request.json()).resolves.toEqual({
          name: 'Salary card',
          type: 'BANK',
          openingBalance: 250,
        })
        return HttpResponse.json({
          ...account,
          name: 'Salary card',
          type: 'BANK',
          openingBalance: 250,
        })
      }),
    )

    await expect(updateAccount(account.id, {
      name: 'Salary card',
      type: 'BANK',
      openingBalance: 250,
    })).resolves.toMatchObject({
      name: 'Salary card',
      currency: 'RUB',
    })
  })

  it('closes an account with DELETE', async () => {
    server.use(
      http.delete('/api/v1/accounts/:accountId', () => (
        new HttpResponse(null, { status: 204 })
      )),
    )

    await expect(closeAccount(account.id)).resolves.toBeUndefined()
  })
})
