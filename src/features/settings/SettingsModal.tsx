import {
    useRef,
} from 'react'
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
import './SettingsModal.css'

type SettingsModalProps = {
    onClose: () => void
    restoreFocus?: () => void
}

const themeOptions: Array<{
    description: string
    icon: 'moon' | 'sun'
    label: string
    value: Theme
}> = [
    {
        description: 'Bright, calm surfaces for daytime use.',
        icon: 'sun',
        label: 'Light',
        value: 'light',
    },
    {
        description: 'Reduced glare with deep navy surfaces.',
        icon: 'moon',
        label: 'Dark',
        value: 'dark',
    },
]

export function SettingsModal({
                                  onClose,
                                  restoreFocus,
                              }: SettingsModalProps) {
    const {setTheme, theme} = useTheme()
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
                        <p>Personalization</p>
                        <h2 id="settings-modal-title">
                            Settings
                        </h2>
                        <span>
                            Make Certis feel comfortable for you.
                        </span>
                    </div>

                    <button
                        ref={closeButtonRef}
                        className="settings-modal-close"
                        type="button"
                        aria-label="Close settings"
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
                            <h3>Appearance</h3>
                            <p>
                                Choose how Certis looks on this device.
                            </p>
                        </div>
                    </div>

                    <div
                        className="settings-theme-options"
                        role="group"
                        aria-label="Color theme"
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
                                            <strong>{option.label}</strong>
                                        </span>

                                        <small>
                                            {option.description}
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

                    <div className="settings-storage-note">
                        <Icon name="shield"/>
                        <span>
                            <strong>Saved on this device</strong>
                            <small>
                                Your theme stays selected after you return.
                            </small>
                        </span>
                    </div>
                </div>
            </section>
        </div>
    )
}
