import {http, HttpResponse} from 'msw'
import {describe, expect, it} from 'vitest'
import {server} from '../../../test/server'
import {
    login,
    logout,
    refreshSession,
    register,
} from './authApi'

describe('authApi', () => {
    it('sends login credentials using the backend contract', async () => {
        let requestCount = 0

        server.use(
            http.post('/api/v1/auth', async ({request}) => {
                requestCount += 1

                expect(await request.json()).toEqual({
                    email: 'person@example.com',
                    password: 'secret',
                })

                return new HttpResponse(null, {status: 200})
            }),
        )

        await expect(
            login({
                email: 'person@example.com',
                password: 'secret',
            }),
        ).resolves.toBeUndefined()

        expect(requestCount).toBe(1)
    })

    it('sends registration data using the backend contract', async () => {
        let requestCount = 0

        server.use(
            http.post(
                '/api/v1/auth/registration',
                async ({request}) => {
                    requestCount += 1

                    expect(await request.json()).toEqual({
                        email: 'person@example.com',
                        password: 'secret',
                        passwordConfirmation: 'secret',
                    })

                    return new HttpResponse(null, {status: 201})
                },
            ),
        )

        await expect(
            register({
                email: 'person@example.com',
                password: 'secret',
                passwordConfirmation: 'secret',
            }),
        ).resolves.toBeUndefined()

        expect(requestCount).toBe(1)
    })

    it('preserves backend registration field errors', async () => {
        server.use(
            http.post(
                '/api/v1/auth/registration',
                () =>
                    HttpResponse.json(
                        {
                            message: 'Validation failed',
                            errors: {
                                password: 'Password is too short',
                            },
                        },
                        {status: 400},
                    ),
            ),
        )

        const request = register({
            email: 'person@example.com',
            password: 'short',
            passwordConfirmation: 'short',
        })

        await expect(request).rejects.toMatchObject({
            status: 400,
            message: 'Validation failed',
            fieldErrors: {
                password: 'Password is too short',
            },
        })
    })

    it('uses the current refresh endpoint', async () => {
        let requestCount = 0

        server.use(
            http.post('/api/v1/auth/tokens', () => {
                requestCount += 1

                return new HttpResponse(null, {status: 204})
            }),
        )

        await expect(refreshSession()).resolves.toBeUndefined()

        expect(requestCount).toBe(1)
    })

    it('deduplicates simultaneous session refreshes', async () => {
        let requestCount = 0

        server.use(
            http.post('/api/v1/auth/tokens', async () => {
                requestCount += 1

                await new Promise((resolve) => {
                    setTimeout(resolve, 10)
                })

                return new HttpResponse(null, {status: 204})
            }),
        )

        await Promise.all([
            refreshSession(),
            refreshSession(),
            refreshSession(),
        ])

        expect(requestCount).toBe(1)
    })

    it('uses the backend message for invalid credentials', async () => {
        server.use(
            http.post('/api/v1/auth', () =>
                HttpResponse.json(
                    {
                        message: 'Invalid email or password',
                    },
                    {status: 401},
                )),
        )

        const request = login({
            email: 'person@example.com',
            password: 'wrong-password',
        })

        await expect(request).rejects.toMatchObject({
            status: 401,
            message: 'Invalid email or password',
        })
    })

    it('uses a fallback message for rate limiting without a response body', async () => {
        server.use(
            http.post(
                '/api/v1/auth',
                () => new HttpResponse(null, {status: 429}),
            ),
        )

        const request = login({
            email: 'person@example.com',
            password: 'secret',
        })

        await expect(request).rejects.toMatchObject({
            status: 429,
            message: 'Too many attempts. Please wait and try again.',
        })
    })

    it('sends logout request using the backend contract', async () => {
        let requestCount = 0

        server.use(
            http.post('/api/v1/auth/logout', () => {
                requestCount += 1

                return new HttpResponse(null, {status: 204})
            }),
        )

        await expect(logout()).resolves.toBeUndefined()

        expect(requestCount).toBe(1)
    })

    it('does not refresh the session when logout is rejected', async () => {
        let logoutRequestCount = 0
        let refreshRequestCount = 0

        server.use(
            http.post('/api/v1/auth/logout', () => {
                logoutRequestCount += 1

                return HttpResponse.json(
                    {
                        message: 'Invalid token',
                    },
                    {status: 401},
                )
            }),
            http.post('/api/v1/auth/tokens', () => {
                refreshRequestCount += 1

                return new HttpResponse(null, {status: 204})
            }),
        )

        await expect(logout()).rejects.toMatchObject({
            status: 401,
            message: 'Invalid token',
        })

        expect(logoutRequestCount).toBe(1)
        expect(refreshRequestCount).toBe(0)
    })
})