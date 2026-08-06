import {http, HttpResponse} from 'msw'
import {describe, expect, it} from 'vitest'
import {server} from '../../test/server'
import {
    apiRequest,
    subscribeToSessionExpired,
} from './client'

describe('apiRequest', () => {
    it('refreshes the session and retries a protected request after 401', async () => {
        let protectedRequestCount = 0
        let refreshRequestCount = 0

        server.use(
            http.get('/api/v1/protected', () => {
                protectedRequestCount += 1

                if (protectedRequestCount === 1) {
                    return new HttpResponse(null, {status: 401})
                }

                return HttpResponse.json({
                    value: 'protected-data',
                })
            }),
            http.post('/api/v1/auth/tokens', () => {
                refreshRequestCount += 1

                return new HttpResponse(null, {status: 204})
            }),
        )

        const response = await apiRequest<{ value: string }>(
            '/api/v1/protected',
        )

        expect(response).toEqual({
            value: 'protected-data',
        })
        expect(protectedRequestCount).toBe(2)
        expect(refreshRequestCount).toBe(1)
    })

    it('shares one refresh request between simultaneous 401 responses', async () => {
        let protectedRequestCount = 0
        let refreshRequestCount = 0
        let sessionWasRefreshed = false

        server.use(
            http.get('/api/v1/protected', () => {
                protectedRequestCount += 1

                if (!sessionWasRefreshed) {
                    return new HttpResponse(null, {status: 401})
                }

                return HttpResponse.json({
                    value: 'protected-data',
                })
            }),
            http.post('/api/v1/auth/tokens', async () => {
                refreshRequestCount += 1

                await new Promise((resolve) => {
                    setTimeout(resolve, 10)
                })

                sessionWasRefreshed = true

                return new HttpResponse(null, {status: 204})
            }),
        )

        const responses = await Promise.all([
            apiRequest<{ value: string }>('/api/v1/protected'),
            apiRequest<{ value: string }>('/api/v1/protected'),
        ])

        expect(responses).toEqual([
            {value: 'protected-data'},
            {value: 'protected-data'},
        ])
        expect(protectedRequestCount).toBe(4)
        expect(refreshRequestCount).toBe(1)
    })

    it('does not refresh the session after login returns 401', async () => {
        let refreshRequestCount = 0

        server.use(
            http.post('/api/v1/auth', () =>
                HttpResponse.json(
                    {
                        message: 'Invalid credentials',
                    },
                    {status: 401},
                )),
            http.post('/api/v1/auth/tokens', () => {
                refreshRequestCount += 1

                return new HttpResponse(null, {status: 204})
            }),
        )

        const request = apiRequest('/api/v1/auth', {
            method: 'POST',
            body: {
                email: 'person@example.com',
                password: 'wrong-password',
            },
        })

        await expect(request).rejects.toMatchObject({
            status: 401,
            message: 'Invalid credentials',
        })
        expect(refreshRequestCount).toBe(0)
    })

    it('does not refresh the session after registration returns 401', async () => {
        let refreshRequestCount = 0

        server.use(
            http.post('/api/v1/auth/registration', () =>
                new HttpResponse(null, {status: 401})),
            http.post('/api/v1/auth/tokens', () => {
                refreshRequestCount += 1

                return new HttpResponse(null, {status: 204})
            }),
        )

        const request = apiRequest('/api/v1/auth/registration', {
            method: 'POST',
            body: {
                email: 'person@example.com',
                password: 'secret',
                passwordConfirmation: 'secret',
            },
        })

        await expect(request).rejects.toMatchObject({
            status: 401,
        })
        expect(refreshRequestCount).toBe(0)
    })

    it('retries the original request no more than once', async () => {
        let protectedRequestCount = 0
        let refreshRequestCount = 0

        server.use(
            http.get('/api/v1/protected', () => {
                protectedRequestCount += 1

                return new HttpResponse(null, {status: 401})
            }),
            http.post('/api/v1/auth/tokens', () => {
                refreshRequestCount += 1

                return new HttpResponse(null, {status: 204})
            }),
        )

        const request = apiRequest('/api/v1/protected')

        await expect(request).rejects.toMatchObject({
            status: 401,
        })
        expect(protectedRequestCount).toBe(2)
        expect(refreshRequestCount).toBe(1)
    })

    it('does not retry the original request when refresh is rejected', async () => {
        let protectedRequestCount = 0
        let refreshRequestCount = 0

        server.use(
            http.get('/api/v1/protected', () => {
                protectedRequestCount += 1

                return new HttpResponse(null, {status: 401})
            }),
            http.post('/api/v1/auth/tokens', () => {
                refreshRequestCount += 1

                return HttpResponse.json(
                    {
                        message: 'Invalid token',
                    },
                    {status: 401},
                )
            }),
        )

        const request = apiRequest('/api/v1/protected')

        await expect(request).rejects.toMatchObject({
            status: 401,
            message: 'Invalid token',
        })
        expect(protectedRequestCount).toBe(1)
        expect(refreshRequestCount).toBe(1)
    })

    it('does not refresh the session for non-authentication errors', async () => {
        let refreshRequestCount = 0

        server.use(
            http.get('/api/v1/protected', () =>
                HttpResponse.json(
                    {
                        message: 'Internal server error',
                    },
                    {status: 500},
                )),
            http.post('/api/v1/auth/tokens', () => {
                refreshRequestCount += 1

                return new HttpResponse(null, {status: 204})
            }),
        )

        const request = apiRequest('/api/v1/protected')

        await expect(request).rejects.toMatchObject({
            status: 500,
            message: 'Internal server error',
        })
        expect(refreshRequestCount).toBe(0)
    })

    it('allows automatic refresh to be disabled explicitly', async () => {
        let protectedRequestCount = 0
        let refreshRequestCount = 0

        server.use(
            http.get('/api/v1/protected', () => {
                protectedRequestCount += 1

                return new HttpResponse(null, {status: 401})
            }),
            http.post('/api/v1/auth/tokens', () => {
                refreshRequestCount += 1

                return new HttpResponse(null, {status: 204})
            }),
        )

        const request = apiRequest('/api/v1/protected', {
            retryOnUnauthorized: false,
        })

        await expect(request).rejects.toMatchObject({
            status: 401,
        })
        expect(protectedRequestCount).toBe(1)
        expect(refreshRequestCount).toBe(0)
    })

    it('notifies listeners when session refresh is rejected with 401', async () => {
        let protectedRequestCount = 0
        let refreshRequestCount = 0
        let expirationCount = 0

        server.use(
            http.get('/api/v1/protected', () => {
                protectedRequestCount += 1

                return new HttpResponse(null, {
                    status: 401,
                })
            }),
            http.post('/api/v1/auth/tokens', () => {
                refreshRequestCount += 1

                return HttpResponse.json(
                    {
                        message: 'Refresh session expired',
                    },
                    {
                        status: 401,
                    },
                )
            }),
        )

        const unsubscribe = subscribeToSessionExpired(() => {
            expirationCount += 1
        })

        try {
            await expect(
                apiRequest('/api/v1/protected'),
            ).rejects.toMatchObject({
                status: 401,
                message: 'Refresh session expired',
            })

            expect(protectedRequestCount).toBe(1)
            expect(refreshRequestCount).toBe(1)
            expect(expirationCount).toBe(1)
        } finally {
            unsubscribe()
        }
    })

    it('notifies listeners when retry is still unauthorized after a successful refresh', async () => {
        let protectedRequestCount = 0
        let refreshRequestCount = 0
        let expirationCount = 0

        server.use(
            http.get('/api/v1/protected', () => {
                protectedRequestCount += 1

                return new HttpResponse(null, {
                    status: 401,
                })
            }),
            http.post('/api/v1/auth/tokens', () => {
                refreshRequestCount += 1

                return new HttpResponse(null, {
                    status: 204,
                })
            }),
        )

        const unsubscribe = subscribeToSessionExpired(() => {
            expirationCount += 1
        })

        try {
            await expect(
                apiRequest('/api/v1/protected'),
            ).rejects.toMatchObject({
                status: 401,
            })

            expect(protectedRequestCount).toBe(2)
            expect(refreshRequestCount).toBe(1)
            expect(expirationCount).toBe(1)
        } finally {
            unsubscribe()
        }
    })

    it('does not notify listeners when session refresh fails with a server error', async () => {
        let protectedRequestCount = 0
        let refreshRequestCount = 0
        let expirationCount = 0

        server.use(
            http.get('/api/v1/protected', () => {
                protectedRequestCount += 1

                return new HttpResponse(null, {
                    status: 401,
                })
            }),
            http.post('/api/v1/auth/tokens', () => {
                refreshRequestCount += 1

                return HttpResponse.json(
                    {
                        message: 'Internal server error',
                    },
                    {
                        status: 500,
                    },
                )
            }),
        )

        const unsubscribe = subscribeToSessionExpired(() => {
            expirationCount += 1
        })

        try {
            await expect(
                apiRequest('/api/v1/protected'),
            ).rejects.toMatchObject({
                status: 500,
                message: 'Internal server error',
            })

            expect(protectedRequestCount).toBe(1)
            expect(refreshRequestCount).toBe(1)
            expect(expirationCount).toBe(0)
        } finally {
            unsubscribe()
        }
    })
})