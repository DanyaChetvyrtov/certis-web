import {
    useRef,
    useState,
} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import {ApiError} from '../../../shared/api/ApiError'
import {
    useModalAccessibility,
} from '../../../shared/hooks/useModalAccessibility'
import {
    deleteTransaction,
} from '../api/transactionsApi'
import type {
    Transaction,
} from '../api/transactionsApi'

type DeleteTransactionDialogProps = {
    transaction: Transaction
    onCancel: () => void
    onDeleted: (transaction: Transaction) => void
    restoreFocus?: () => void
}

export function DeleteTransactionDialog({
    transaction,
    onCancel,
    onDeleted,
    restoreFocus,
}: DeleteTransactionDialogProps) {
    const {t} = useTranslation()
    const [isDeleting, setIsDeleting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const cancelButtonRef = useRef<HTMLButtonElement>(null)

    const dialogRef =
        useModalAccessibility<HTMLDivElement>({
            canClose: !isDeleting,
            initialFocusRef: cancelButtonRef,
            onClose: onCancel,
            restoreFocus,
        })

    const confirmDeletion = async () => {
        setIsDeleting(true)
        setErrorMessage('')

        try {
            await deleteTransaction(transaction.id)
            onDeleted(transaction)
        } catch (error) {
            setErrorMessage(
                error instanceof ApiError
                    ? error.message
                    : t('transactions.deleteDialog.error'),
            )
        } finally {
            setIsDeleting(false)
        }
    }

    const transactionName =
        transaction.merchant?.trim()
        || transaction.note?.trim()
        || (transaction.type === 'INCOME'
            ? t('transactions.incomeTransaction')
            : t('transactions.expenseTransaction'))

    return (
        <div
            className="transaction-modal-layer"
            role="presentation"
        >
            <div
                ref={dialogRef}
                className="transaction-delete-dialog"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-transaction-title"
                aria-describedby="delete-transaction-description"
                tabIndex={-1}
            >
                <span className="transaction-delete-icon">
                    <Icon name="trash"/>
                </span>

                <h2 id="delete-transaction-title">
                    {t('transactions.deleteDialog.title', {name: transactionName})}
                </h2>

                <p id="delete-transaction-description">
                    {t('transactions.deleteDialog.description')}
                </p>

                {errorMessage && (
                    <p
                        className="transaction-form-error"
                        role="alert"
                    >
                        <Icon name="alert"/>
                        {errorMessage}
                    </p>
                )}

                <footer className="transaction-delete-actions">
                    <button
                        ref={cancelButtonRef}
                        type="button"
                        disabled={isDeleting}
                        onClick={onCancel}
                    >
                        {t('transactions.deleteDialog.cancel')}
                    </button>
                    <button
                        className="danger"
                        type="button"
                        disabled={isDeleting}
                        onClick={() => void confirmDeletion()}
                    >
                        {isDeleting
                            ? t('transactions.deleteDialog.deleting')
                            : t('transactions.deleteDialog.action')}
                    </button>
                </footer>
            </div>
        </div>
    )
}
