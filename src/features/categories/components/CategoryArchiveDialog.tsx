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
    const {t} = useTranslation()
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
                    : t('categories.archive.error'),
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
                <p>{t('categories.archive.eyebrow')}</p>
                <h2 id="archive-category-title">
                    {t('categories.archive.title', {name: category.name})}
                </h2>
                <p id="archive-category-description">
                    {t('categories.archive.description')}
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
                        {t('categories.archive.keep')}
                    </button>
                    <button
                        className="danger"
                        type="button"
                        disabled={isArchiving}
                        onClick={() => void archive()}
                    >
                        {isArchiving
                            ? t('categories.archive.archiving')
                            : t('categories.archive.action')}
                    </button>
                </div>
            </div>
        </div>
    )
}
