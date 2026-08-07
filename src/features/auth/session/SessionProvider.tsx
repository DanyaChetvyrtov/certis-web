import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import type {ReactNode} from 'react'
import {ApiError} from '../../../shared/api/ApiError'
import {
    subscribeToSessionExpired,
} from '../../../shared/api/client'
import {getCurrentProfile} from '../../profile/api/profileApi'
import type {Profile} from '../../profile/api/profileApi'
import {
    login,
    logout,
    register,
} from '../api/authApi'
import type {
    LoginRequest,
    RegisterRequest,
} from '../api/authApi'
import {
    SessionContext,
} from './SessionContext'
import type {
    SessionContextValue,
    SessionStatus,
} from './SessionContext'

type ResolvedSessionStatus = Exclude<
    SessionStatus,
    'checking'
>

type ResolvedSession = {
    profile: Profile | null
    status: ResolvedSessionStatus
}

const statusForError = (
    error: unknown,
): ResolvedSessionStatus => {
    if (!(error instanceof ApiError)) {
        return 'unavailable'
    }

    return error.status === 401
        ? 'unauthenticated'
        : 'unavailable'
}

const resolveSession = async (): Promise<ResolvedSession> => {
    try {
        const profile = await getCurrentProfile()

        return {
            profile,
            status: 'authenticated',
        }
    } catch (error) {
        return {
            profile: null,
            status: statusForError(error),
        }
    }
}

export function SessionProvider({
                                    children,
                                }: {
    children: ReactNode
}) {
    const [status, setStatus] = useState<SessionStatus>('checking')
    const [profile, setProfileState] = useState<Profile | null>(null)

    const sessionRevisionRef = useRef(0)

    const [
        profilePhotoRevision,
        setProfilePhotoRevision,
    ] = useState(0)

    const refreshProfilePhoto =
        useCallback((): void => {
            setProfilePhotoRevision(
                (current) => current + 1,
            )
        }, [])

    const expireSession = useCallback((): void => {
        sessionRevisionRef.current += 1

        setProfileState(null)
        setStatus('unauthenticated')
    }, [])

    useEffect(
        () => subscribeToSessionExpired(expireSession),
        [expireSession],
    )

    const applyResolvedSession = useCallback(
        (
            resolvedSession: ResolvedSession,
            revision: number,
        ): void => {
            if (revision !== sessionRevisionRef.current) {
                return
            }

            setProfileState(resolvedSession.profile)
            setStatus(resolvedSession.status)
        },
        [],
    )

    const loadProfile = useCallback(
        async (): Promise<void> => {
            const revision = ++sessionRevisionRef.current
            const currentProfile = await getCurrentProfile()

            if (revision !== sessionRevisionRef.current) {
                return
            }

            setProfileState(currentProfile)
            setStatus('authenticated')
        },
        [],
    )

    const checkSession = useCallback(
        async (): Promise<void> => {
            const revision = ++sessionRevisionRef.current

            setStatus('checking')

            const resolvedSession = await resolveSession()

            applyResolvedSession(
                resolvedSession,
                revision,
            )
        },
        [applyResolvedSession],
    )

    useEffect(() => {
        const revision = ++sessionRevisionRef.current
        let isActive = true

        void resolveSession().then((resolvedSession) => {
            if (!isActive) {
                return
            }

            applyResolvedSession(
                resolvedSession,
                revision,
            )
        })

        return () => {
            isActive = false
        }
    }, [applyResolvedSession])

    const signIn = useCallback(
        async (request: LoginRequest): Promise<void> => {
            await login(request)
            await loadProfile()
        },
        [loadProfile],
    )

    const signOut = useCallback(
        async (): Promise<void> => {
            await logout()

            sessionRevisionRef.current += 1

            setProfileState(null)
            setStatus('unauthenticated')
        },
        [],
    )

    const signUp = useCallback(
        (request: RegisterRequest): Promise<void> =>
            register(request),
        [],
    )

    const setProfile = useCallback(
        (newProfile: Profile): void => {
            sessionRevisionRef.current += 1

            setProfileState(newProfile)
            setStatus('authenticated')
        },
        [],
    )

    const value = useMemo<SessionContextValue>(
        () => ({
            profile,
            profilePhotoRevision,
            refreshProfilePhoto,
            retry: checkSession,
            setProfile,
            signIn,
            signOut,
            signUp,
            status,
        }),
        [
            checkSession,
            profile,
            profilePhotoRevision,
            refreshProfilePhoto,
            setProfile,
            signIn,
            signOut,
            signUp,
            status,
        ],
    )

    return (
        <SessionContext.Provider value={value}>
            {children}
        </SessionContext.Provider>
    )
}
