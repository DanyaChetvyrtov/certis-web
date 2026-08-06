import {ApiError} from './ApiError'
import type {ApiErrorBody} from './ApiError'

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

const LOGIN_PATH = '/api/v1/auth'
const REGISTRATION_PATH = '/api/v1/auth/registration'
const REFRESH_PATH = '/api/v1/auth/tokens'
const LOGOUT_PATH = '/api/v1/auth/logout'

const NON_REFRESHABLE_PATHS = new Set([
    LOGIN_PATH,
    REGISTRATION_PATH,
    REFRESH_PATH,
    LOGOUT_PATH,
])

const SESSION_BOUNDARY_PATHS = new Set([
    LOGIN_PATH,
    LOGOUT_PATH,
])

const advancesSessionRevision = (
    path: string,
): boolean =>
    SESSION_BOUNDARY_PATHS.has(
        normalizePath(path),
    )

type FallbackMessage =
    | string
    | ((status: number) => string)

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
    body?: unknown

    fallbackMessage?: FallbackMessage

    retryOnUnauthorized?: boolean
}

let sessionRefreshRequest: Promise<void> | null = null

let sessionRevision = 0

type SessionExpiredListener = () => void

const sessionExpiredListeners =
    new Set<SessionExpiredListener>()

export const subscribeToSessionExpired = (
    listener: SessionExpiredListener,
): (() => void) => {
    sessionExpiredListeners.add(listener)

    return () => {
        sessionExpiredListeners.delete(listener)
    }
}

const notifySessionExpired = (): void => {
    sessionExpiredListeners.forEach((listener) => {
        listener()
    })
}

const isUnauthorizedError = (
    error: unknown,
): error is ApiError =>
    error instanceof ApiError
    && error.status === 401

const normalizePath = (path: string): string =>
    path.split(/[?#]/, 1)[0]

const isNativeBody = (body: unknown): body is BodyInit =>
    typeof body === 'string'
    || body instanceof Blob
    || body instanceof FormData
    || body instanceof URLSearchParams
    || body instanceof ArrayBuffer
    || ArrayBuffer.isView(body)

const prepareRequestBody = (
    body: unknown,
    headers: Headers,
): BodyInit | undefined => {
    if (body === undefined) {
        return undefined
    }

    if (isNativeBody(body)) {
        return body
    }

    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
    }

    return JSON.stringify(body)
}

const resolveFallbackMessage = (
    fallbackMessage: FallbackMessage | undefined,
    status: number,
): string | undefined =>
    typeof fallbackMessage === 'function'
        ? fallbackMessage(status)
        : fallbackMessage

const parseErrorBody = async (
    response: Response,
): Promise<ApiErrorBody | undefined> => {
    let responseText: string

    try {
        responseText = await response.text()
    } catch {
        return undefined
    }

    if (!responseText) {
        return undefined
    }

    try {
        return JSON.parse(responseText) as ApiErrorBody
    } catch {
        return undefined
    }
}

const parseError = async (
    response: Response,
    fallbackMessage: FallbackMessage | undefined,
): Promise<ApiError> => {
    const body = await parseErrorBody(response)
    const fallback = resolveFallbackMessage(
        fallbackMessage,
        response.status,
    )

    return new ApiError(
        body?.message
        || fallback
        || 'We could not complete your request. Please try again.',
        response.status,
        body?.errors,
    )
}

const parseSuccessfulResponse = async <T>(
    response: Response,
    method: string | undefined,
): Promise<T> => {
    const hasNoBody =
        method?.toUpperCase() === 'HEAD'
        || response.status === 204
        || response.status === 205
        || response.headers.get('content-length') === '0'

    if (hasNoBody) {
        return undefined as T
    }

    const responseText = await response.text()

    if (!responseText) {
        return undefined as T
    }

    return JSON.parse(responseText) as T
}

const isAbortError = (error: unknown): boolean =>
    error instanceof Error && error.name === 'AbortError'

async function sendRequest<T>(
    path: string,
    options: ApiRequestOptions,
): Promise<T> {
    const {
        body,
        fallbackMessage,
        headers: providedHeaders,
        ...requestInit
    } = options

    delete requestInit.retryOnUnauthorized

    const headers = new Headers(providedHeaders)
    const requestBody = prepareRequestBody(body, headers)

    let response: Response

    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...requestInit,
            credentials: 'include',
            headers,
            body: requestBody,
        })
    } catch (error) {
        if (isAbortError(error)) {
            throw error
        }

        throw new ApiError(
            'Could not reach Certis. Check that the API is running and try again.',
            0,
        )
    }

    if (!response.ok) {
        throw await parseError(response, fallbackMessage)
    }

    return parseSuccessfulResponse<T>(
        response,
        requestInit.method,
    )
}

const mayRefreshSession = (
    path: string,
    options: ApiRequestOptions,
    error: unknown,
): error is ApiError =>
    error instanceof ApiError
    && error.status === 401
    && options.retryOnUnauthorized !== false
    && !NON_REFRESHABLE_PATHS.has(normalizePath(path))

export function refreshSession(): Promise<void> {
    if (!sessionRefreshRequest) {
        const refreshRevision = sessionRevision

        sessionRefreshRequest = sendRequest<void>(
            REFRESH_PATH,
            {
                method: 'POST',
                retryOnUnauthorized: false,
                fallbackMessage: (status) =>
                    status === 401
                        ? 'Your session has expired. Sign in again.'
                        : 'We could not refresh your session. Please try again.',
            },
        )
            .then(() => {
                if (refreshRevision === sessionRevision) {
                    sessionRevision += 1
                }
            })
            .catch((error: unknown) => {
                if (
                    isUnauthorizedError(error)
                    && refreshRevision === sessionRevision
                ) {
                    notifySessionExpired()
                }

                throw error
            })
            .finally(() => {
                sessionRefreshRequest = null
            })
    }

    return sessionRefreshRequest
}

export async function apiRequest<T = void>(
    path: string,
    options: ApiRequestOptions = {},
): Promise<T> {
    const requestSessionRevision = sessionRevision

    try {
        const response = await sendRequest<T>(
            path,
            options,
        )

        if (advancesSessionRevision(path)) {
            sessionRevision += 1
        }

        return response
    } catch (error) {
        if (!mayRefreshSession(path, options, error)) {
            if (
                isUnauthorizedError(error)
                && !NON_REFRESHABLE_PATHS.has(
                    normalizePath(path),
                )
                && requestSessionRevision === sessionRevision
            ) {
                notifySessionExpired()
            }

            throw error
        }

        if (requestSessionRevision === sessionRevision) {
            await refreshSession()
        }

        const retrySessionRevision = sessionRevision

        try {
            return await sendRequest<T>(path, {
                ...options,
                retryOnUnauthorized: false,
            })
        } catch (retryError) {
            if (
                isUnauthorizedError(retryError)
                && retrySessionRevision === sessionRevision
            ) {
                notifySessionExpired()
            }

            throw retryError
        }
    }
}