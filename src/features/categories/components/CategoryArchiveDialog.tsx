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
    archiveCategory,
} from '../api/categoriesApi'
import type {
    Category,
} from '../api/categoriesApi'
import './CategoryArchiveDialog.css'

type CategoryArchiveDialogProps = {
    category: Category
    onCancel: () => void
    onArchived: (category: Category) => void
    restoreFocus?: () => void
}

export function CategoryArchiveDialog({
    category,
    onCancel,
    onArchived,
    restoreFocus,
}: CategoryArchiveDialogProps) {
    const [isArchiving, setIsArchiving] =
        useState(false)
    const [errorMessage, setErrorMessage] =
        useState('')
    const cancelButtonRef =
        useRef<HTMLButtonElement>(null)

    const dialogRef =
        useModalAccessibility<HTMLDivElement>({
            canClose: !isArchiving,
            initialFocusRef: cancelButtonRef,
            onClose: onCancel,
            restoreFocus,
        })

    const archive = async () => {
        setIsArchiving(true)
        setErrorMessage('')

        try {
            await archiveCategory(category.id)
            onArchived(category)
        } catch (error) {
            setErrorMessage(
                error instanceof ApiError
                    ? error.message
                    : 'We could not archive this category. Please try again.',
            )
        } finally {
            setIsArchiving(false)
        }
    }

    return (
        <div
            className="category-archive-layer"
            role="presentation"
        >
            <div
                ref={dialogRef}
                className="category-archive-dialog"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="archive-category-title"
                aria-describedby="archive-category-description"
                tabIndex={-1}
            >
                <span className="category-archive-icon">
                    <Icon name="trash"/>
                </span>
                <p>Archive category</p>
                <h2 id="archive-category-title">
                    Archive “{category.name}”?
                </h2>
                <p id="archive-category-description">
                    It will no longer be available for new transactions.
                    Existing history stays unchanged, and you can restore the
                    category later.
                </p>

                {errorMessage && (
                    <p
                        className="category-archive-error"
                        role="alert"
                    >
                        <Icon name="alert"/>
                        {errorMessage}
                    </p>
                )}

                <div className="category-archive-actions">
                    <button
                        ref={cancelButtonRef}
                        type="button"
                        disabled={isArchiving}
                        onClick={onCancel}
                    >
                        Keep category
                    </button>
                    <button
                        className="danger"
                        type="button"
                        disabled={isArchiving}
                        onClick={() => void archive()}
                    >
                        {isArchiving
                            ? 'Archiving…'
                            : 'Archive category'}
                    </button>
                </div>
            </div>
        </div>
    )
}
