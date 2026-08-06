import {
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react'
import {http, HttpResponse} from 'msw'
import {useState} from 'react'
import {describe, expect, it} from 'vitest'
import {server} from '../../../test/server'
import {
    SessionProvider,
    useSession,
} from './SessionContext'

const profileResponse = {
    id: 'profile-id',
    name: 'Daniel',
    surname: 'Carter',
    dateOfBirth: '2000-01-01',
}

function SessionProbe() {
    const {
        profile,
        retry,
        signIn,
        signOut,
        status,
    } = useSession()

    const [signOutFailed, setSignOutFailed] =
        useState(false)

    return (
        <div>
            <span data-testid="session-status">
                {status}
            </span>

            <span data-testid="profile-name">
                {profile?.name ?? 'profile-required'}
            </span>

            <button
                type="button"
                onClick={() => void signIn({
                    email: 'person@example.com',
                    password: 'secret',
                })}
            >
                Sign in
            </button>

            <button
                type="button"
                onClick={() => void retry()}
            >
                Retry
            </button>

            <button
                type="button"
                onClick={() => {
                    setSignOutFailed(false)

                    void signOut().catch(() => {
                        setSignOutFailed(true)
                    })
                }}
            >
                Sign out
            </button>

            {signOutFailed && (
                <span>sign-out-failed</span>
            )}
        </div>
    )
}

describe('SessionProvider', () => {
    it('treats a missing profile as authenticated onboarding', async () => {
        let profileRequestCount = 0
        let refreshRequestCount = 0

        server.use(
            http.get('/api/v1/profiles/me', () => {
                profileRequestCount += 1

                return new HttpResponse(null, {status: 404})
            }),
            http.post('/api/v1/auth/tokens', () => {
                refreshRequestCount += 1

                return new HttpResponse(null, {status: 204})
            }),
        )

        render(
            <SessionProvider>
                <SessionProbe/>
            </SessionProvider>,
        )

        expect(
            await screen.findByText('authenticated'),
        ).toBeInTheDocument()

        expect(
            screen.getByText('profile-required'),
        ).toBeInTheDocument()

        expect(profileRequestCount).toBe(1)
        expect(refreshRequestCount).toBe(0)
    })

    it('loads the profile without refresh when the access token is valid', async () => {
        let profileRequestCount = 0
        let refreshRequestCount = 0

        server.use(
            http.get('/api/v1/profiles/me', () => {
                profileRequestCount += 1

                return HttpResponse.json(profileResponse)
            }),
            http.post('/api/v1/auth/tokens', () => {
                refreshRequestCount += 1

                return new HttpResponse(null, {status: 204})
            }),
        )

        render(
            <SessionProvider>
                <SessionProbe/>
            </SessionProvider>,
        )

        expect(
            await screen.findByText('Daniel'),
        ).toBeInTheDocument()

        expect(
            screen.getByText('authenticated'),
        ).toBeInTheDocument()

        expect(profileRequestCount).toBe(1)
        expect(refreshRequestCount).toBe(0)
    })

    it('restores the session after the access token expires', async () => {
        let profileRequestCount = 0
        let refreshRequestCount = 0
        let sessionWasRefreshed = false

        server.use(
            http.get('/api/v1/profiles/me', () => {
                profileRequestCount += 1

                if (!sessionWasRefreshed) {
                    return new HttpResponse(null, {status: 401})
                }

                return HttpResponse.json(profileResponse)
            }),
            http.post('/api/v1/auth/tokens', () => {
                refreshRequestCount += 1
                sessionWasRefreshed = true

                return new HttpResponse(null, {status: 204})
            }),
        )

        render(
            <SessionProvider>
                <SessionProbe/>
            </SessionProvider>,
        )

        expect(
            await screen.findByText('Daniel'),
        ).toBeInTheDocument()

        expect(
            screen.getByText('authenticated'),
        ).toBeInTheDocument()

        expect(profileRequestCount).toBe(2)
        expect(refreshRequestCount).toBe(1)
    })

    it('becomes unauthenticated when the refresh token is rejected', async () => {
        let profileRequestCount = 0
        let refreshRequestCount = 0

        server.use(
            http.get('/api/v1/profiles/me', () => {
                profileRequestCount += 1

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

        render(
            <SessionProvider>
                <SessionProbe/>
            </SessionProvider>,
        )

        expect(
            await screen.findByText('unauthenticated'),
        ).toBeInTheDocument()

        expect(
            screen.getByText('profile-required'),
        ).toBeInTheDocument()

        expect(profileRequestCount).toBe(1)
        expect(refreshRequestCount).toBe(1)
    })

    it('marks the session service as unavailable after a backend error', async () => {
        let refreshRequestCount = 0

        server.use(
            http.get('/api/v1/profiles/me', () =>
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

        render(
            <SessionProvider>
                <SessionProbe/>
            </SessionProvider>,
        )

        expect(
            await screen.findByText('unavailable'),
        ).toBeInTheDocument()

        expect(refreshRequestCount).toBe(0)
    })

    it('marks the session service as unavailable after rate limiting', async () => {
        server.use(
            http.get(
                '/api/v1/profiles/me',
                () => new HttpResponse(null, {status: 429}),
            ),
        )

        render(
            <SessionProvider>
                <SessionProbe/>
            </SessionProvider>,
        )

        expect(
            await screen.findByText('unavailable'),
        ).toBeInTheDocument()
    })

    it('loads the current profile after a successful sign in', async () => {
        let isSignedIn = false
        let loginRequestCount = 0
        let profileRequestCount = 0
        let refreshRequestCount = 0

        server.use(
            http.get('/api/v1/profiles/me', () => {
                profileRequestCount += 1

                if (!isSignedIn) {
                    return new HttpResponse(null, {status: 401})
                }

                return HttpResponse.json(profileResponse)
            }),
            http.post('/api/v1/auth/tokens', () => {
                refreshRequestCount += 1

                return new HttpResponse(null, {status: 401})
            }),
            http.post('/api/v1/auth', async ({request}) => {
                loginRequestCount += 1

                expect(await request.json()).toEqual({
                    email: 'person@example.com',
                    password: 'secret',
                })

                isSignedIn = true

                return new HttpResponse(null, {status: 200})
            }),
        )

        render(
            <SessionProvider>
                <SessionProbe/>
            </SessionProvider>,
        )

        expect(
            await screen.findByText('unauthenticated'),
        ).toBeInTheDocument()

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Sign in',
            }),
        )

        expect(
            await screen.findByText('Daniel'),
        ).toBeInTheDocument()

        expect(
            screen.getByText('authenticated'),
        ).toBeInTheDocument()

        expect(loginRequestCount).toBe(1)
        expect(profileRequestCount).toBe(2)
        expect(refreshRequestCount).toBe(1)
    })

    it('allows retrying session verification after a temporary failure', async () => {
        let profileRequestCount = 0

        server.use(
            http.get('/api/v1/profiles/me', () => {
                profileRequestCount += 1

                if (profileRequestCount === 1) {
                    return new HttpResponse(null, {status: 500})
                }

                return HttpResponse.json(profileResponse)
            }),
        )

        render(
            <SessionProvider>
                <SessionProbe/>
            </SessionProvider>,
        )

        expect(
            await screen.findByText('unavailable'),
        ).toBeInTheDocument()

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Retry',
            }),
        )

        expect(
            await screen.findByText('Daniel'),
        ).toBeInTheDocument()

        await waitFor(() => {
            expect(profileRequestCount).toBe(2)
        })
    })

    it('clears the session after a successful sign out', async () => {
        let logoutRequestCount = 0

        server.use(
            http.get(
                '/api/v1/profiles/me',
                () => HttpResponse.json(profileResponse),
            ),
            http.post('/api/v1/auth/logout', () => {
                logoutRequestCount += 1

                return new HttpResponse(null, {status: 204})
            }),
        )

        render(
            <SessionProvider>
                <SessionProbe/>
            </SessionProvider>,
        )

        expect(
            await screen.findByText('Daniel'),
        ).toBeInTheDocument()

        expect(
            screen.getByText('authenticated'),
        ).toBeInTheDocument()

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Sign out',
            }),
        )

        expect(
            await screen.findByText('unauthenticated'),
        ).toBeInTheDocument()

        expect(
            screen.getByText('profile-required'),
        ).toBeInTheDocument()

        expect(logoutRequestCount).toBe(1)
    })

    it('keeps the current session when sign out fails', async () => {
        let logoutRequestCount = 0

        server.use(
            http.get(
                '/api/v1/profiles/me',
                () => HttpResponse.json(profileResponse),
            ),
            http.post('/api/v1/auth/logout', () => {
                logoutRequestCount += 1

                return HttpResponse.json(
                    {
                        message: 'Internal server error',
                    },
                    {status: 500},
                )
            }),
        )

        render(
            <SessionProvider>
                <SessionProbe/>
            </SessionProvider>,
        )

        expect(
            await screen.findByText('Daniel'),
        ).toBeInTheDocument()

        fireEvent.click(
            screen.getByRole('button', {
                name: 'Sign out',
            }),
        )

        expect(
            await screen.findByText('sign-out-failed'),
        ).toBeInTheDocument()

        expect(
            screen.getByText('authenticated'),
        ).toBeInTheDocument()

        expect(
            screen.getByText('Daniel'),
        ).toBeInTheDocument()

        expect(logoutRequestCount).toBe(1)
    })
})