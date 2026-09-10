import {useTranslation} from 'react-i18next'
import {
    DEFAULT_LANGUAGE,
    getLanguageLocale,
    isLanguage,
} from './language'
import type {Language} from './language'

export function useLanguage() {
    const {i18n} = useTranslation()
    const resolvedLanguage =
        i18n.resolvedLanguage?.split('-')[0]
    const language: Language = isLanguage(resolvedLanguage)
        ? resolvedLanguage
        : DEFAULT_LANGUAGE

    return {
        language,
        locale: getLanguageLocale(language),
        setLanguage: (nextLanguage: Language) =>
            i18n.changeLanguage(nextLanguage),
    }
}
