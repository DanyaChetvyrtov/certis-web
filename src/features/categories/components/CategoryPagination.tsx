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
    if (totalElements === 0) {
        return null
    }

    const firstItem = page * pageSize + 1
    const lastItem = Math.min((page + 1) * pageSize, totalElements)

    return (
        <nav
            className="category-pagination"
            aria-label="Category pagination"
        >
            <p>
                Showing {firstItem}–{lastItem} of {totalElements}
            </p>
            <div>
                <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => onPageChange(page - 1)}
                >
                    Previous
                </button>
                <span>
                    Page {page + 1} of {totalPages}
                </span>
                <button
                    type="button"
                    disabled={page + 1 >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                >
                    Next
                </button>
            </div>
        </nav>
    )
}
