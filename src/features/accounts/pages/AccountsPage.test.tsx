import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../../test/server'
import { AccountsPage } from './AccountsPage'

vi.mock('../../auth/session/SessionContext', () => ({
  useSession: () => ({
    profile: {
      id: 'profile-id',
      name: 'Daniel',
      surname: 'Carter',
      dateOfBirth: '2000-01-01',
    },
  }),
}))

describe('AccountsPage', () => {
  it('renders real accounts without mixing currencies in the total', async () => {
    server.use(
      http.get('/api/v1/accounts', () => HttpResponse.json([
        {
          id: 'rub-account',
          name: 'Main card',
          type: 'CARD',
          openingBalance: 100,
          balance: 125.5,
          currency: 'RUB',
          createdAt: '2026-08-01T10:00:00Z',
        },
        {
          id: 'eur-account',
          name: 'Travel cash',
          type: 'CASH',
          openingBalance: 900,
          balance: 900,
          currency: 'EUR',
          createdAt: '2026-07-31T10:00:00Z',
        },
      ])),
    )

    render(
      <MemoryRouter>
        <AccountsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Main card')).toBeInTheDocument()
    expect(screen.getByText('Travel cash')).toBeInTheDocument()
    expect(screen.getAllByText('₽126')).toHaveLength(2)
    expect(screen.queryByText('₽1,026')).not.toBeInTheDocument()
    expect(screen.getByText('DC')).toBeInTheDocument()
  })

  it('does not offer lifecycle actions for a closed account', async () => {
    server.use(
      http.get('/api/v1/accounts', () => HttpResponse.json([
        {
          id: 'active-account',
          name: 'Main card',
          type: 'CARD',
          openingBalance: 100,
          balance: 125.5,
          currency: 'RUB',
          createdAt: '2026-08-01T10:00:00Z',
        },
        {
          id: 'closed-account',
          name: 'Archived cash',
          type: 'CASH',
          openingBalance: 900,
          balance: 900,
          currency: 'RUB',
          createdAt: '2026-07-01T10:00:00Z',
          closedAt: '2026-08-01T11:00:00Z',
        },
      ])),
    )

    render(
      <MemoryRouter>
        <AccountsPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Archived cash')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Actions for Main card' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Actions for Archived cash' })).not.toBeInTheDocument()
  })
})
