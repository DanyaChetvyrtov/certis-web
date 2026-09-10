import i18n from 'i18next'
import {initReactI18next} from 'react-i18next'
import {
    DEFAULT_LANGUAGE,
    getStoredLanguage,
    isLanguage,
    LANGUAGE_STORAGE_KEY,
} from './language'
import {resources} from './resources'

const initialLanguage = getStoredLanguage()

void i18n
    .use(initReactI18next)
    .init({
        fallbackLng: DEFAULT_LANGUAGE,
        interpolation: {
            escapeValue: false,
        },
        lng: initialLanguage,
        resources,
        supportedLngs: ['en', 'ru'],
    })

function applyLanguage(language: string): void {
    const normalizedLanguage = language.split('-')[0]
    const nextLanguage = isLanguage(normalizedLanguage)
        ? normalizedLanguage
        : DEFAULT_LANGUAGE

    if (typeof document !== 'undefined') {
        document.documentElement.lang = nextLanguage
    }

    if (typeof window !== 'undefined') {
        window.localStorage.setItem(
            LANGUAGE_STORAGE_KEY,
            nextLanguage,
        )
    }
}

applyLanguage(initialLanguage)
i18n.on('languageChanged', applyLanguage)

export default i18n
