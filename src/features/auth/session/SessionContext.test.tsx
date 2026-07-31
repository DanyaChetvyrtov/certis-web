import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/server'
import { SessionProvider, useSession } from './SessionContext'

function SessionProbe() {
  const { profile, signIn, status } = useSession()

  return (
    <div>
      <span>{status}</span>
      <span>{profile?.name ?? 'profile-required'}</span>
      <button
        type="button"
        onClick={() => void signIn({
          email: 'person@example.com',
          password: 'secret',
        })}
      >
        Sign in
      </button>
    </div>
  )
}

describe('SessionProvider', () => {
  it('derives profile onboarding from the backend after session refresh', async () => {
    server.use(
      http.post('/api/v1/auth/tokens/access', () => new HttpResponse(null, { status: 204 })),
      http.get('/api/v1/profiles', () => new HttpResponse(null, { status: 404 })),
    )

    render(<SessionProvider><SessionProbe /></SessionProvider>)

    expect(await screen.findByText('authenticated')).toBeInTheDocument()
    expect(screen.getByText('profile-required')).toBeInTheDocument()
  })

  it('loads the current profile after a successful sign in', async () => {
    let profileRequestCount = 0
    server.use(
      http.post('/api/v1/auth/tokens/access', () => new HttpResponse(null, { status: 401 })),
      http.post('/api/v1/auth', () => new HttpResponse(null, { status: 200 })),
      http.get('/api/v1/profiles', () => {
        profileRequestCount += 1
        return HttpResponse.json({
          id: 'profile-id',
          name: 'Daniel',
          surname: 'Carter',
          dateOfBirth: '2000-01-01',
        })
      }),
    )

    render(<SessionProvider><SessionProbe /></SessionProvider>)
    expect(await screen.findByText('unauthenticated')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Daniel')).toBeInTheDocument()
    await waitFor(() => expect(profileRequestCount).toBe(1))
  })
})
