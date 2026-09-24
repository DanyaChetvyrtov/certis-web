const TRANSACTIONS_PATH = '/transactions'
const STORAGE_PREFIX = 'certis.transactions.lastUrl.'

const storageKey = (profileId: string): string =>
    `${STORAGE_PREFIX}${profileId}`

export const getTransactionsDestination = (
    profileId: string | null | undefined,
): string => {
    if (!profileId) return TRANSACTIONS_PATH

    try {
        const stored = window.sessionStorage.getItem(storageKey(profileId))

        if (!stored) return TRANSACTIONS_PATH

        const url = new URL(stored, window.location.origin)

        return url.origin === window.location.origin
            && url.pathname === TRANSACTIONS_PATH
            && !url.hash
            ? `${TRANSACTIONS_PATH}${url.search}`
            : TRANSACTIONS_PATH
    } catch {
        return TRANSACTIONS_PATH
    }
}

export const rememberTransactionsDestination = (
    profileId: string | null | undefined,
    params: URLSearchParams,
): void => {
    if (!profileId) return

    const query = params.toString()
    const destination = query
        ? `${TRANSACTIONS_PATH}?${query}`
        : TRANSACTIONS_PATH

    try {
        window.sessionStorage.setItem(
            storageKey(profileId),
            destination,
        )
    } catch {
        // URL navigation still works when tab storage is unavailable.
    }
}

export const clearTransactionsDestination = (
    profileId: string | null | undefined,
): void => {
    if (!profileId) return

    try {
        window.sessionStorage.removeItem(storageKey(profileId))
    } catch {
        // The stored destination cannot be cleared when storage is unavailable.
    }
}
