import {CertisLogo} from '../components/Icons'
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
    return (
        <main className="session-check-page">
            <CertisLogo className="session-check-logo"/>
            {hasError ? (
                <>
                    <p className="eyebrow eyebrow-gold">Connection interrupted</p>
                    <h1>Certis API is unavailable</h1>
                    <p>
                        Make sure certis-api is running on port 8080, then try the session
                        check again.
                    </p>
                    <div className="session-check-actions">
                        <button type="button" onClick={onRetry}>
                            Try again
                        </button>
                        {onBack && (
                            <button
                                className="secondary"
                                type="button"
                                onClick={onBack}
                            >
                                Back to sign in
                            </button>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <span className="session-spinner" aria-hidden="true"/>
                    <h1>Checking your session</h1>
                    <p>Connecting securely to Certis…</p>
                </>
            )}
        </main>
    )
}
