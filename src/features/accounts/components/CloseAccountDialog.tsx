import {Icon} from '../../../components/Icons'
import {useTranslation} from 'react-i18next'
import {ApiError} from '../../../shared/api/ApiError'
import {closeAccount} from '../api/accountsApi'
import type {Account} from '../api/accountsApi'
import './AccountModals.css'
import {
    useRef,
    useState,
} from 'react'

import {
    useModalAccessibility,
} from '../../../shared/hooks/useModalAccessibility'

type CloseAccountDialogProps = {
    account: Account
    onCancel: () => void
    onClosed: () => Promise<void>
    restoreFocus?: () => void
}

export function CloseAccountDialog({
                                       account,
                                       onCancel,
                                       onClosed,
                                       restoreFocus,
                                   }: CloseAccountDialogProps) {
    const {t} = useTranslation()
    const [isClosing, setIsClosing] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const cancelButtonRef = useRef<HTMLButtonElement>(null)

    const dialogRef =
        useModalAccessibility<HTMLDivElement>({
            canClose: !isClosing,
            initialFocusRef: cancelButtonRef,
            onClose: onCancel,
            restoreFocus,
        })

    const close = async () => {
        setIsClosing(true)
        setErrorMessage('')

        try {
            await closeAccount(account.id)
            await onClosed()
        } catch (error) {
            setErrorMessage(
                error instanceof ApiError
                    ? error.message
                    : t('accounts.closeDialog.error'),
            )
        } finally {
            setIsClosing(false)
        }
    }

    return (
        <div className="account-modal-layer" role="presentation">
            <div
                ref={dialogRef}
                className="account-confirm-modal"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="close-account-title"
                aria-describedby="close-account-description"
                tabIndex={-1}
            >
                <span className="account-confirm-icon"><Icon name="trash"/></span>
                <p>{t('accounts.closeDialog.eyebrow')}</p>
                <h2 id="close-account-title">{t('accounts.closeDialog.title', {name: account.name})}</h2>
                <p id="close-account-description">
                    {t('accounts.closeDialog.description')}
                </p>

                {errorMessage && (
                    <p className="account-form-error" role="alert">
                        <Icon name="alert"/>
                        {errorMessage}
                    </p>
                )}

                <div className="account-modal-actions">
                    <button
                        ref={cancelButtonRef}
                        type="button"
                        disabled={isClosing}
                        onClick={onCancel}
                    >
                        {t('accounts.closeDialog.keep')}
                    </button>
                    <button
                        className="danger"
                        type="button"
                        disabled={isClosing}
                        onClick={() => void close()}
                    >
                        {isClosing ? t('accounts.closeDialog.closing') : t('accounts.closeDialog.close')}
                    </button>
                </div>
            </div>
        </div>
    )
}
