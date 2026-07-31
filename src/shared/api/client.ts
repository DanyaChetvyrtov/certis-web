import { ApiError } from './ApiError'
import type { ApiErrorBody } from './ApiError'

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  fallbackMessage?: string | ((status: number) => string)
}

const parseError = async (
  response: Response,
  fallbackMessage: RequestOptions['fallbackMessage'],
) => {
  let body: ApiErrorBody | undefined

  try {
    body = (await response.json()) as ApiErrorBody
  } catch {
    body = undefined
  }

  const fallback =
    typeof fallbackMessage === 'function'
      ? fallbackMessage(response.status)
      : fallbackMessage

  return new ApiError(
    body?.message || fallback || 'We could not complete your request. Please try again.',
    response.status,
    body?.errors,
  )
}

export async function apiRequest<T = void>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, fallbackMessage, headers, ...init } = options
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: body === undefined
        ? headers
        : { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(
      'Could not reach Certis. Check that the API is running and try again.',
      0,
    )
  }

  if (!response.ok) {
    throw await parseError(response, fallbackMessage)
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T
  }

  const responseText = await response.text()

  if (!responseText) {
    return undefined as T
  }

  return JSON.parse(responseText) as T
}
