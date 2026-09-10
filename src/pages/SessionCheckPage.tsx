import {CertisLogo} from '../components/Icons'
import {LoadingIndicator} from '../components/LoadingIndicator'
import {useTranslation} from 'react-i18next'
import './SessionCheckPage.css'

type SessionCheckPageProps = {
    hasError?: boolean
    onBack?: () => void
    onRetry?: () => void
}

export function SessionCheckPage({
                                     hasError = false,
                                     onBack,
                                     onRetry,
                                 }: SessionCheckPageProps) {
    const {t} = useTranslation()

    return (
        <main className="session-check-page">
            <CertisLogo className="session-check-logo"/>
            {hasError ? (
                <>
                    <p className="eyebrow eyebrow-gold">{t('dashboard.session.interrupted')}</p>
                    <h1>{t('dashboard.session.unavailable')}</h1>
                    <p>{t('dashboard.session.unavailableDescription')}</p>
                    <div className="session-check-actions">
                        <button type="button" onClick={onRetry}>
                            {t('dashboard.session.retry')}
                        </button>
                        {onBack && (
                            <button
                                className="secondary"
                                type="button"
                                onClick={onBack}
                            >
                                {t('dashboard.session.back')}
                            </button>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <LoadingIndicator
                        label={t('dashboard.session.checking')}
                        size="large"
                        tone="light"
                    />
                    <h1>{t('dashboard.session.checking')}</h1>
                    <p>{t('dashboard.session.connecting')}</p>
                </>
            )}
        </main>
    )
}
