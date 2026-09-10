import {useTranslation} from 'react-i18next'

type CategoryPaginationProps = {
    page: number
    pageSize: number
    totalElements: number
    totalPages: number
    onPageChange: (page: number) => void
}

export function CategoryPagination({
    page,
    pageSize,
    totalElements,
    totalPages,
    onPageChange,
}: CategoryPaginationProps) {
    const {t} = useTranslation()

    if (totalElements === 0) {
        return null
    }

    const firstItem = page * pageSize + 1
    const lastItem = Math.min((page + 1) * pageSize, totalElements)

    return (
        <nav
            className="category-pagination"
            aria-label={t('categories.pagination.label')}
        >
            <p>
                {t('categories.pagination.showing', {
                    first: firstItem,
                    last: lastItem,
                    total: totalElements,
                })}
            </p>
            <div>
                <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => onPageChange(page - 1)}
                >
                    {t('categories.pagination.previous')}
                </button>
                <span>
                    {t('categories.pagination.page', {page: page + 1, total: totalPages})}
                </span>
                <button
                    type="button"
                    disabled={page + 1 >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                >
                    {t('categories.pagination.next')}
                </button>
            </div>
        </nav>
    )
}
