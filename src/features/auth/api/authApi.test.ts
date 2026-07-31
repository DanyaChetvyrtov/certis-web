import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/server'
import { login, refreshSession, register } from './authApi'

describe('authApi', () => {
  it('sends login credentials with the expected contract', async () => {
    server.use(
      http.post('/api/v1/auth', async ({ request }) => {
        expect(await request.json()).toEqual({
          email: 'person@example.com',
          password: 'secret',
        })
        return new HttpResponse(null, { status: 200 })
      }),
    )

    await expect(login({
      email: 'person@example.com',
      password: 'secret',
    })).resolves.toBeUndefined()
  })

  it('preserves backend registration field errors', async () => {
    server.use(
      http.post('/api/v1/auth/registration', () => HttpResponse.json({
        message: 'Validation failed',
        errors: { password: 'Password is too short' },
      }, { status: 400 })),
    )

    const result = register({
      email: 'person@example.com',
      password: 'short',
      passwordConfirmation: 'short',
    })

    await expect(result).rejects.toMatchObject({
      status: 400,
      fieldErrors: { password: 'Password is too short' },
    })
  })

  it('deduplicates simultaneous session refreshes', async () => {
    let requestCount = 0
    server.use(
      http.post('/api/v1/auth/tokens/access', async () => {
        requestCount += 1
        await new Promise((resolve) => setTimeout(resolve, 10))
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await Promise.all([refreshSession(), refreshSession()])
    expect(requestCount).toBe(1)
  })
})
