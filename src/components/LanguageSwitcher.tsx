import {useTranslation} from 'react-i18next'
import type {Language} from '../i18n/language'
import {useLanguage} from '../i18n/useLanguage'
import './LanguageSwitcher.css'

type LanguageSwitcherProps = {
    className?: string
}

const languages: Language[] = ['en', 'ru']

export function LanguageSwitcher({
                                     className,
                                 }: LanguageSwitcherProps) {
    const {t} = useTranslation()
    const {language, setLanguage} = useLanguage()

    return (
        <div
            className={[
                'language-switcher',
                className,
            ].filter(Boolean).join(' ')}
            role="group"
            aria-label={t('languageSwitcher.label')}
        >
            {languages.map((option) => (
                <button
                    className={language === option ? 'active' : undefined}
                    type="button"
                    aria-pressed={language === option}
                    aria-label={t(`languageSwitcher.${option}`)}
                    key={option}
                    onClick={() => void setLanguage(option)}
                >
                    {option.toUpperCase()}
                </button>
            ))}
        </div>
    )
}
