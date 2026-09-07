export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'certis-theme'

const isTheme = (value: unknown): value is Theme =>
    value === 'light' || value === 'dark'

export const getStoredTheme = (): Theme => {
    if (typeof window === 'undefined') {
        return 'light'
    }

    try {
        const storedTheme = window.localStorage.getItem(
            THEME_STORAGE_KEY,
        )

        return isTheme(storedTheme)
            ? storedTheme
            : 'light'
    } catch {
        return 'light'
    }
}

export const applyTheme = (theme: Theme): void => {
    if (typeof document === 'undefined') {
        return
    }

    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
}

export const saveTheme = (theme: Theme): void => {
    try {
        window.localStorage.setItem(
            THEME_STORAGE_KEY,
            theme,
        )
    } catch {
        // Theme switching should still work when storage is unavailable.
    }
}

export const initializeTheme = (): Theme => {
    const theme = getStoredTheme()

    applyTheme(theme)

    return theme
}
