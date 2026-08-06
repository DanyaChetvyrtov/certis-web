import {
    apiRequest,
    refreshSession,
} from '../../../shared/api/client'

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
            return 'Check the entered details and try again.'
        case 401:
            return 'The email or password is incorrect.'
        case 409:
            return 'An account with this email already exists.'
        case 429:
            return 'Too many attempts. Please wait and try again.'
        default:
            return 'We could not complete your request. Please try again.'
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
            'We could not sign you out. Please try again.',
    })

export {refreshSession}