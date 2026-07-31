import { apiRequest } from '../../../shared/api/client'

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
    case 404:
      return 'No account was found for this email.'
    case 409:
      return 'An account with this email already exists.'
    default:
      return 'We could not complete your request. Please try again.'
  }
}

export const login = (request: LoginRequest) =>
  apiRequest('/api/v1/auth', {
    method: 'POST',
    body: request,
    fallbackMessage: getAuthFallback,
  })

export const register = (request: RegisterRequest) =>
  apiRequest('/api/v1/auth/registration', {
    method: 'POST',
    body: request,
    fallbackMessage: getAuthFallback,
  })

let sessionRefreshRequest: Promise<void> | null = null

export const refreshSession = () => {
  if (!sessionRefreshRequest) {
    sessionRefreshRequest = apiRequest('/api/v1/auth/tokens/access', {
      method: 'POST',
      fallbackMessage: getAuthFallback,
    }).finally(() => {
      sessionRefreshRequest = null
    })
  }

  return sessionRefreshRequest
}
