import {
    useRef,
} from 'react'
import {useTranslation} from 'react-i18next'
import {
    Icon,
} from '../../components/Icons'
import {
    useModalAccessibility,
} from '../../shared/hooks/useModalAccessibility'
import {
    useTheme,
} from './ThemeContext'
import type {
    Theme,
} from './theme'
import {useLanguage} from '../../i18n/useLanguage'
import type {Language} from '../../i18n/language'
import './SettingsModal.css'

type SettingsModalProps = {
    onClose: () => void
    restoreFocus?: () => void
}

const themeOptions: Array<{
    icon: 'moon' | 'sun'
    translationKey: 'light' | 'dark'
    value: Theme
}> = [
    {
        icon: 'sun',
        translationKey: 'light',
        value: 'light',
    },
    {
        icon: 'moon',
        translationKey: 'dark',
        value: 'dark',
    },
]

const languageOptions: Array<{
    flag: string
    nativeKey: 'englishNative' | 'russianNative'
    translationKey: 'english' | 'russian'
    value: Language
}> = [
    {
        flag: '🇬🇧',
        nativeKey: 'englishNative',
        translationKey: 'english',
        value: 'en',
    },
    {
        flag: '🇷🇺',
        nativeKey: 'russianNative',
        translationKey: 'russian',
        value: 'ru',
    },
]

export function SettingsModal({
                                  onClose,
                                  restoreFocus,
                              }: SettingsModalProps) {
    const {setTheme, theme} = useTheme()
    const {language, setLanguage} = useLanguage()
    const {t} = useTranslation()
    const closeButtonRef =
        useRef<HTMLButtonElement>(null)
    const dialogRef = useModalAccessibility({
        initialFocusRef: closeButtonRef,
        onClose,
        restoreFocus,
    })

    return (
        <div className="settings-modal-layer">
            <button
                className="settings-modal-backdrop"
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={onClose}
            />

            <section
                ref={dialogRef}
                className="settings-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-modal-title"
            >
                <header className="settings-modal-header">
                    <div>
                        <p>{t('settings.eyebrow')}</p>
                        <h2 id="settings-modal-title">
                            {t('settings.title')}
                        </h2>
                        <span>
                            {t('settings.subtitle')}
                        </span>
                    </div>

                    <button
                        ref={closeButtonRef}
                        className="settings-modal-close"
                        type="button"
                        aria-label={t('settings.close')}
                        onClick={onClose}
                    >
                        <Icon name="close"/>
                    </button>
                </header>

                <div className="settings-modal-body">
                    <div className="settings-section-heading">
                        <span>
                            <Icon name="sun"/>
                        </span>

                        <div>
                            <h3>{t('settings.appearance.title')}</h3>
                            <p>
                                {t('settings.appearance.description')}
                            </p>
                        </div>
                    </div>

                    <div
                        className="settings-theme-options"
                        role="group"
                        aria-label={t('settings.appearance.ariaLabel')}
                    >
                        {themeOptions.map((option) => {
                            const isSelected =
                                theme === option.value

                            return (
                                <button
                                    className={
                                        isSelected
                                            ? 'settings-theme-option selected'
                                            : 'settings-theme-option'
                                    }
                                    type="button"
                                    aria-pressed={isSelected}
                                    key={option.value}
                                    onClick={() =>
                                        setTheme(option.value)
                                    }
                                >
                                    <span
                                        className={`settings-theme-preview ${option.value}`}
                                        aria-hidden="true"
                                    >
                                        <span/>
                                        <i/>
                                        <b/>
                                    </span>

                                    <span className="settings-theme-copy">
                                        <span>
                                            <Icon name={option.icon}/>
                                            <strong>
                                                {t(`settings.appearance.${option.translationKey}.label`)}
                                            </strong>
                                        </span>

                                        <small>
                                            {t(`settings.appearance.${option.translationKey}.description`)}
                                        </small>
                                    </span>

                                    <span
                                        className="settings-theme-check"
                                        aria-hidden="true"
                                    >
                                        <Icon name="check-circle"/>
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    <div className="settings-section-heading settings-language-heading">
                        <span className="settings-language-icon" aria-hidden="true">
                            文
                        </span>

                        <div>
                            <h3>{t('settings.language.title')}</h3>
                            <p>{t('settings.language.description')}</p>
                        </div>
                    </div>

                    <div
                        className="settings-language-options"
                        role="group"
                        aria-label={t('settings.language.ariaLabel')}
                    >
                        {languageOptions.map((option) => {
                            const isSelected =
                                language === option.value

                            return (
                                <button
                                    className={
                                        isSelected
                                            ? 'settings-language-option selected'
                                            : 'settings-language-option'
                                    }
                                    type="button"
                                    aria-pressed={isSelected}
                                    key={option.value}
                                    onClick={() =>
                                        void setLanguage(option.value)
                                    }
                                >
                                    <span className="settings-language-flag" aria-hidden="true">
                                        {option.flag}
                                    </span>
                                    <span>
                                        <strong>
                                            {t(`settings.language.${option.translationKey}`)}
                                        </strong>
                                        <small>
                                            {t(`settings.language.${option.nativeKey}`)}
                                        </small>
                                    </span>
                                    <span
                                        className="settings-language-check"
                                        aria-hidden="true"
                                    >
                                        <Icon name="check-circle"/>
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    <div className="settings-storage-note">
                        <Icon name="shield"/>
                        <span>
                            <strong>{t('settings.storage.title')}</strong>
                            <small>
                                {t('settings.storage.description')}
                            </small>
                        </span>
                    </div>
                </div>
            </section>
        </div>
    )
}
