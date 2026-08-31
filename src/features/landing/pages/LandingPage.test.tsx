import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LandingPage } from './LandingPage'

describe('LandingPage', () => {
  it('presents the product and links visitors to account creation', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /your money, with a clear sense of direction/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: /preview of the certis personal finance dashboard/i,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('demo@digital-hustle.ru')).toBeInTheDocument()
    expect(
      screen.getAllByText(/Digital Hustle/i).length,
    ).toBeGreaterThan(0)

    const startPlanningLinks = screen.getAllByRole('link', {
      name: /start planning/i,
    })

    expect(startPlanningLinks).toHaveLength(3)
    expect(startPlanningLinks[0]).toHaveAttribute('href', '/auth#create-account')
    const signInLinks = screen.getAllByRole('link', { name: 'Sign in' })

    expect(signInLinks).toHaveLength(2)
    expect(signInLinks[0]).toHaveAttribute('href', '/auth#sign-in')
  })
})
