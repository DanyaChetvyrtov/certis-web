import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError } from '../../../shared/api/ApiError'
import { getCurrentProfile } from '../../profile/api/profileApi'
import type { Profile } from '../../profile/api/profileApi'
import { login, refreshSession, register } from '../api/authApi'
import type { LoginRequest, RegisterRequest } from '../api/authApi'

export type SessionStatus =
  | 'checking'
  | 'authenticated'
  | 'unauthenticated'
  | 'unavailable'

type SessionContextValue = {
  profile: Profile | null
  retry: () => Promise<void>
  setProfile: (profile: Profile) => void
  signIn: (request: LoginRequest) => Promise<void>
  signUp: (request: RegisterRequest) => Promise<void>
  status: SessionStatus
}

const SessionContext = createContext<SessionContextValue | null>(null)

const statusForError = (error: unknown): SessionStatus =>
  error instanceof ApiError && error.status === 0
    ? 'unavailable'
    : 'unauthenticated'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('checking')
  const [profile, setProfileState] = useState<Profile | null>(null)

  const loadProfile = useCallback(async () => {
    const currentProfile = await getCurrentProfile()
    setProfileState(currentProfile)
    setStatus('authenticated')
  }, [])

  const checkSession = useCallback(async () => {
    setStatus('checking')

    try {
      await refreshSession()
      await loadProfile()
    } catch (error) {
      setProfileState(null)
      setStatus(statusForError(error))
    }
  }, [loadProfile])

  useEffect(() => {
    let isActive = true

    void refreshSession()
      .then(getCurrentProfile)
      .then(
        (currentProfile) => {
          if (isActive) {
            setProfileState(currentProfile)
            setStatus('authenticated')
          }
        },
        (error: unknown) => {
          if (isActive) {
            setProfileState(null)
            setStatus(statusForError(error))
          }
        },
      )

    return () => {
      isActive = false
    }
  }, [])

  const signIn = useCallback(async (request: LoginRequest) => {
    await login(request)
    await loadProfile()
  }, [loadProfile])

  const signUp = useCallback((request: RegisterRequest) => register(request), [])

  const value = useMemo<SessionContextValue>(() => ({
    profile,
    retry: checkSession,
    setProfile: setProfileState,
    signIn,
    signUp,
    status,
  }), [checkSession, profile, signIn, signUp, status])

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}

// The provider and its dedicated hook form one public session module.
// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
  const context = useContext(SessionContext)

  if (!context) {
    throw new Error('useSession must be used inside SessionProvider')
  }

  return context
}
