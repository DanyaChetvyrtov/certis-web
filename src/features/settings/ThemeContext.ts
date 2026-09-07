import {
    createContext,
    useContext,
} from 'react'
import type {
    Theme,
} from './theme'

export type ThemeContextValue = {
    theme: Theme
    setTheme: (theme: Theme) => void
}

export const ThemeContext =
    createContext<ThemeContextValue | null>(null)

export const useTheme = (): ThemeContextValue => {
    const context = useContext(ThemeContext)

    if (!context) {
        throw new Error(
            'useTheme must be used within ThemeProvider',
        )
    }

    return context
}
