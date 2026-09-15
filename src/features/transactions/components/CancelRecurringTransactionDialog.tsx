import {useMemo, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import {ApiError} from '../../../shared/api/ApiError'
import {useModalAccessibility} from '../../../shared/hooks/useModalAccessibility'
import {cancelRecurringTransaction} from '../api/recurringTransactionsApi'
import type {RecurringTransaction} from '../api/recurringTransactionsApi'
import './CancelRecurringTransactionDialog.css'

type Props = {
    transaction: RecurringTransaction
    onCancel: () => void
    onCancelled: (transaction: RecurringTransaction) => void
    restoreFocus?: () => void
}

export function CancelRecurringTransactionDialog({
    transaction,
    onCancel,
    onCancelled,
}: Props) {
    const {t} = useTranslation()
    const [isCancelling, setIsCancelling] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const cancelButtonRef = useRef<HTMLButtonElement>(null)

    const confirmation = useMemo(() => {
        const text = t('transactions.recurringView.cancelConfirm', {name: transaction.name})
        const questionMarkIndex = text.indexOf('?')

        if (questionMarkIndex < 0) {
            return {title: text, description: ''}
        }

        return {
            title: text.slice(0, questionMarkIndex + 1),
            description: text.slice(questionMarkIndex + 1).trim(),
        }
    }, [t, transaction.name])

    const dialogRef = useModalAccessibility<HTMLDivElement>({
        canClose: !isCancelling,
        initialFocusRef: cancelButtonRef,
        onClose: onCancel,
    })

    const confirmCancellation = async () => {
        setIsCancelling(true)
        setErrorMessage('')

        try {
            await cancelRecurringTransaction(transaction.id)
            onCancelled(transaction)
        } catch (error) {
            setErrorMessage(
                error instanceof ApiError
                    ? error.message
                    : t('transactions.recurringView.cancelError'),
            )
        } finally {
            setIsCancelling(false)
        }
    }

    return createPortal(
        <div
            className="recurring-cancel-layer"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !isCancelling) {
                    onCancel()
                }
            }}
        >
            <div
                ref={dialogRef}
                className="recurring-cancel-dialog"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="cancel-recurring-title"
                aria-describedby={confirmation.description ? 'cancel-recurring-description' : undefined}
                tabIndex={-1}
            >
                <span className="recurring-cancel-icon">
                    <Icon name="trash"/>
                </span>

                <h2 id="cancel-recurring-title">{confirmation.title}</h2>

                {confirmation.description && (
                    <p id="cancel-recurring-description">{confirmation.description}</p>
                )}

                {errorMessage && (
                    <p className="recurring-cancel-error" role="alert">
                        <Icon name="alert"/>
                        {errorMessage}
                    </p>
                )}

                <footer className="recurring-cancel-actions">
                    <button
                        ref={cancelButtonRef}
                        type="button"
                        disabled={isCancelling}
                        onClick={onCancel}
                    >
                        {t('transactions.recurringForm.cancel')}
                    </button>
                    <button
                        className="danger"
                        type="button"
                        disabled={isCancelling}
                        onClick={() => void confirmCancellation()}
                    >
                        {t('transactions.recurringView.cancelLabel', {name: transaction.name})}
                    </button>
                </footer>
            </div>
        </div>,
        document.body,
    )
}
