export const LANGUAGE_STORAGE_KEY = 'certis-language'

export type Language = 'en' | 'ru'

export const DEFAULT_LANGUAGE: Language = 'en'

export function isLanguage(value: unknown): value is Language {
    return value === 'en' || value === 'ru'
}

export function getStoredLanguage(): Language {
    if (typeof window === 'undefined') {
        return DEFAULT_LANGUAGE
    }

    const storedLanguage = window.localStorage.getItem(
        LANGUAGE_STORAGE_KEY,
    )

    return isLanguage(storedLanguage)
        ? storedLanguage
        : DEFAULT_LANGUAGE
}

export function getLanguageLocale(language: Language): string {
    return language === 'ru' ? 'ru-RU' : 'en-US'
}
