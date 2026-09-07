import {
    useCallback,
    useMemo,
    useState,
} from 'react'
import type {
    ReactNode,
} from 'react'
import {
    ThemeContext,
} from './ThemeContext'
import {
    applyTheme,
    getStoredTheme,
    saveTheme,
} from './theme'
import type {
    Theme,
} from './theme'
import './DarkTheme.css'

export function ThemeProvider({
                                  children,
                              }: {
    children: ReactNode
}) {
    const [theme, setThemeState] =
        useState<Theme>(() => {
            const storedTheme = getStoredTheme()

            applyTheme(storedTheme)

            return storedTheme
        })

    const setTheme = useCallback(
        (nextTheme: Theme): void => {
            applyTheme(nextTheme)
            saveTheme(nextTheme)
            setThemeState(nextTheme)
        },
        [],
    )

    const value = useMemo(
        () => ({
            setTheme,
            theme,
        }),
        [setTheme, theme],
    )

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    )
}
