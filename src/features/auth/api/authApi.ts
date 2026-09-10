import {
    apiRequest,
    refreshSession,
} from '../../../shared/api/client'
import i18n from '../../../i18n/i18n'

export type LoginRequest = {
    email: string
    password: string
}

export type RegisterRequest = LoginRequest & {
    passwordConfirmation: string
}

const getAuthFallback = (status: number): string => {
    switch (status) {
        case 400:
            return i18n.t('auth.errors.details')
        case 401:
            return i18n.t('auth.errors.credentials')
        case 409:
            return i18n.t('auth.errors.exists')
        case 429:
            return i18n.t('auth.errors.attempts')
        default:
            return i18n.t('common.requestError')
    }
}

export const login = (
    request: LoginRequest,
): Promise<void> =>
    apiRequest('/api/v1/auth', {
        method: 'POST',
        body: request,
        retryOnUnauthorized: false,
        fallbackMessage: getAuthFallback,
    })

export const register = (
    request: RegisterRequest,
): Promise<void> =>
    apiRequest('/api/v1/auth/registration', {
        method: 'POST',
        body: request,
        retryOnUnauthorized: false,
        fallbackMessage: getAuthFallback,
    })

export const logout = (): Promise<void> =>
    apiRequest('/api/v1/auth/logout', {
        method: 'POST',
        retryOnUnauthorized: false,
        fallbackMessage:
            i18n.t('navigation.signOutError'),
    })

export {refreshSession}
