import {
    createContext,
    useContext,
} from 'react'
import type {
    Profile,
} from '../../profile/api/profileApi'
import type {
    LoginRequest,
    RegisterRequest,
} from '../api/authApi'

export type SessionStatus =
    | 'checking'
    | 'authenticated'
    | 'unauthenticated'
    | 'unavailable'

export type SessionContextValue = {
    profile: Profile | null
    profilePhotoRevision: number
    refreshProfilePhoto: () => void
    retry: () => Promise<void>
    setProfile: (
        profile: Profile,
    ) => void
    signIn: (
        request: LoginRequest,
    ) => Promise<void>
    signOut: () => Promise<void>
    signUp: (
        request: RegisterRequest,
    ) => Promise<void>
    status: SessionStatus
}

export const SessionContext =
    createContext<SessionContextValue | null>(
        null,
    )

export function useSession(): SessionContextValue {
    const context =
        useContext(SessionContext)

    if (!context) {
        throw new Error(
            'useSession must be used inside SessionProvider',
        )
    }

    return context
}