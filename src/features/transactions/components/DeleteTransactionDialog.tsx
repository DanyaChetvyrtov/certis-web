import {
    useRef,
    useState,
} from 'react'
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

const deletionErrorMessage = (
    error: unknown,
): string =>
    error instanceof ApiError
        ? error.message
        : 'We could not delete this transaction. Please try again.'

export function DeleteTransactionDialog({
    transaction,
    onCancel,
    onDeleted,
    restoreFocus,
}: DeleteTransactionDialogProps) {
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
            setErrorMessage(deletionErrorMessage(error))
        } finally {
            setIsDeleting(false)
        }
    }

    const transactionName =
        transaction.merchant?.trim()
        || transaction.note?.trim()
        || (transaction.type === 'INCOME'
            ? 'Income transaction'
            : 'Expense transaction')

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
                    Delete “{transactionName}”?
                </h2>

                <p id="delete-transaction-description">
                    This removes the transaction from your activity and recalculates the account balance.
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
                        Cancel
                    </button>
                    <button
                        className="danger"
                        type="button"
                        disabled={isDeleting}
                        onClick={() => void confirmDeletion()}
                    >
                        {isDeleting
                            ? 'Deleting…'
                            : 'Delete transaction'}
                    </button>
                </footer>
            </div>
        </div>
    )
}
