import {Icon} from '../../../components/Icons'
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
    onClosed: () => void
}

export function CloseAccountDialog({
                                       account,
                                       onCancel,
                                       onClosed,
                                   }: CloseAccountDialogProps) {
    const [isClosing, setIsClosing] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const cancelButtonRef = useRef<HTMLButtonElement>(null)

    const dialogRef =
        useModalAccessibility<HTMLDivElement>({
            canClose: !isClosing,
            initialFocusRef: cancelButtonRef,
            onClose: onCancel,
        })

    const close = async () => {
        setIsClosing(true)
        setErrorMessage('')

        try {
            await closeAccount(account.id)
            onClosed()
        } catch (error) {
            setErrorMessage(
                error instanceof ApiError
                    ? error.message
                    : 'We could not close this account. Please try again.',
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
                <p>Close account</p>
                <h2 id="close-account-title">Close “{account.name}”?</h2>
                <p id="close-account-description">
                    It will be archived and excluded from your total balance. Its history
                    and final balance will stay available.
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
                        Keep account
                    </button>
                    <button
                        className="danger"
                        type="button"
                        disabled={isClosing}
                        onClick={() => void close()}
                    >
                        {isClosing ? 'Closing…' : 'Close account'}
                    </button>
                </div>
            </div>
        </div>
    )
}
