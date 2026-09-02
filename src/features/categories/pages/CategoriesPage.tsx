import {
    useMemo,
    useRef,
    useState,
} from 'react'
import {Icon} from '../../../components/Icons'
import {WorkspaceSidebar} from '../../../layouts/WorkspaceSidebar'
import {useSession} from '../../auth/session/SessionContext'
import type {
    Category,
    CategoryType,
} from '../api/categoriesApi'
import {
    CategoryArchiveDialog,
} from '../components/CategoryArchiveDialog'
import {
    CategoryAnalyticsPanels,
} from '../components/CategoryAnalyticsPanels'
import {CategoryCard} from '../components/CategoryCard'
import {
    CategoryPagination,
} from '../components/CategoryPagination'
import {
    CategoryControls,
} from '../components/CategoryControls'
import type {CategoryStatus} from '../components/CategoryControls'
import {
    CategoryFormModal,
} from '../components/CategoryFormModal'
import {
    UncategorizedTransactionsModal,
} from '../components/UncategorizedTransactionsModal'
import {useCategories} from '../hooks/useCategories'
import {
    useCategoryAnalytics,
} from '../hooks/useCategoryAnalytics'
import './CategoriesPage.css'

type ArchiveDialogState = {
    category: Category
    restoreFocus: () => void
}

type UncategorizedModalState = {
    restoreFocus: () => void
}

const categoryTypeLabel: Record<CategoryType, string> = {
    EXPENSE: 'Expense',
    INCOME: 'Income',
}

export function CategoriesPage() {
    const {profile} = useSession()
    const {
        activeCategories,
        archivedCategories,
        changeCurrency,
        changeSort,
        currency,
        loadCategories,
        loadError,
        loadState,
        markCategoryArchived,
        month,
        notice,
        page,
        pageSize,
        restoringCategoryId,
        restoreArchivedCategory,
        saveCategory,
        setPage,
        sort,
        totalElements,
        totalPages,
    } = useCategories(profile?.preferredCurrency ?? 'RUB')
    const [selectedType, setSelectedType] =
        useState<CategoryType>('EXPENSE')
    const [selectedStatus, setSelectedStatus] =
        useState<CategoryStatus>('ACTIVE')
    const [searchQuery, setSearchQuery] = useState('')
    const [isFormOpen, setFormOpen] = useState(false)
    const [editingCategory, setEditingCategory] =
        useState<Category | null>(null)
    const [archiveDialog, setArchiveDialog] =
        useState<ArchiveDialogState | null>(null)
    const [uncategorizedModal, setUncategorizedModal] =
        useState<UncategorizedModalState | null>(null)
    const restoreFocusRef = useRef<HTMLElement | null>(null)
    const activeStatusRef = useRef<HTMLButtonElement>(null)
    const archivedStatusRef = useRef<HTMLButtonElement>(null)
    const {
        analytics,
        loadAnalytics,
        loadError: analyticsLoadError,
        loadState: analyticsLoadState,
    } = useCategoryAnalytics(month, currency, selectedType)

    const statusCategories =
        selectedStatus === 'ACTIVE'
            ? activeCategories
            : archivedCategories

    const categoryCounts = useMemo(
        () => ({
            EXPENSE: statusCategories.filter(
                (category) => category.type === 'EXPENSE',
            ).length,
            INCOME: statusCategories.filter(
                (category) => category.type === 'INCOME',
            ).length,
        }),
        [statusCategories],
    )

    const visibleCategories = useMemo(() => {
        const normalizedQuery =
            searchQuery.trim().toLocaleLowerCase()

        return statusCategories
            .filter((category) =>
                category.type === selectedType
                && (
                    !normalizedQuery
                    || category.name
                        .toLocaleLowerCase()
                        .includes(normalizedQuery)
                ),
            )
    }, [
        searchQuery,
        selectedType,
        statusCategories,
    ])

    const openCategoryForm = (
        restoreFocusTarget: HTMLElement,
    ) => {
        restoreFocusRef.current = restoreFocusTarget
        setEditingCategory(null)
        setFormOpen(true)
    }

    const openEditForm = (
        category: Category,
        restoreFocusTarget: HTMLButtonElement,
    ) => {
        restoreFocusRef.current = restoreFocusTarget
        setEditingCategory(category)
        setFormOpen(true)
    }

    const closeCategoryForm = () => {
        setFormOpen(false)
        setEditingCategory(null)
    }

    const handleCategorySaved = (
        savedCategory: Category,
    ) => {
        const isEditing = Boolean(editingCategory)

        saveCategory(savedCategory, isEditing)
        void loadAnalytics()
        setSelectedType(savedCategory.type)
        setSelectedStatus('ACTIVE')

        if (!isEditing) {
            setSearchQuery('')
        }

        closeCategoryForm()
    }

    const openArchiveDialog = (
        category: Category,
        restoreFocusTarget: HTMLButtonElement,
    ) => {
        setArchiveDialog({
            category,
            restoreFocus: () => {
                if (restoreFocusTarget.isConnected) {
                    restoreFocusTarget.focus()
                    return
                }

                archivedStatusRef.current?.focus()
            },
        })
    }

    const handleCategoryArchived = (
        archivedCategory: Category,
    ) => {
        markCategoryArchived(archivedCategory)
        void loadAnalytics()
        setArchiveDialog(null)
    }

    const handleCategoryRestore = async (
        category: Category,
    ) => {
        const wasRestored =
            await restoreArchivedCategory(category)

        if (wasRestored) {
            void loadAnalytics()
            window.requestAnimationFrame(
                () => activeStatusRef.current?.focus(),
            )
        }
    }

    const openUncategorizedTransactions = (
        restoreFocusTarget: HTMLButtonElement,
    ) => {
        setUncategorizedModal({
            restoreFocus: () => {
                if (restoreFocusTarget.isConnected) {
                    restoreFocusTarget.focus()
                }
            },
        })
    }

    const handleTransactionsAssigned = async () => {
        await Promise.all([
            loadCategories(),
            loadAnalytics(),
        ])
    }

    const activeTypeCopy =
        categoryTypeLabel[selectedType].toLocaleLowerCase()
    const isStatusEmpty = statusCategories.length === 0
    const hasNoCategories = totalElements === 0
    const emptyStateTitle = isStatusEmpty
        ? hasNoCategories && selectedStatus === 'ACTIVE'
            ? 'Create your first category'
            : selectedStatus === 'ACTIVE'
                ? 'No active categories on this page'
                : 'No archived categories on this page'
        : `No ${activeTypeCopy} categories found`
    const emptyStateDescription = isStatusEmpty
        ? hasNoCategories && selectedStatus === 'ACTIVE'
            ? 'Add a reusable label for your transactions and budgets.'
            : 'Try another page or change the category status.'
        : 'Try changing the category type or search query on this page.'

    return (
        <div className="categories-workspace">
            <WorkspaceSidebar activePage="categories"/>

            <main className="categories-main">
                <header className="categories-page-header">
                    <div>
                        <h1>Categories</h1>
                        <p>
                            Organize income and expenses with a consistent vocabulary.
                        </p>
                    </div>

                    <button
                        className="new-category-button"
                        type="button"
                        onClick={(event) =>
                            openCategoryForm(event.currentTarget)
                        }
                    >
                        <Icon name="plus"/>
                        New category
                    </button>
                </header>

                {notice && (
                    <div
                        className={
                            notice.kind === 'error'
                                ? 'categories-notice error'
                                : 'categories-notice'
                        }
                        role={
                            notice.kind === 'error'
                                ? 'alert'
                                : 'status'
                        }
                    >
                        {notice.message}
                    </div>
                )}

                <section className="categories-card">
                    <CategoryControls
                        activeCount={activeCategories.length}
                        activeStatusRef={activeStatusRef}
                        archivedCount={archivedCategories.length}
                        archivedStatusRef={archivedStatusRef}
                        categoryCounts={categoryCounts}
                        currency={currency}
                        searchQuery={searchQuery}
                        selectedSort={sort}
                        selectedStatus={selectedStatus}
                        selectedType={selectedType}
                        onCurrencyChange={changeCurrency}
                        onSearchQueryChange={setSearchQuery}
                        onSortChange={changeSort}
                        onStatusChange={setSelectedStatus}
                        onTypeChange={setSelectedType}
                    />

                    <div
                        id="category-list"
                        className="category-list"
                        role="tabpanel"
                        aria-labelledby={
                            selectedType === 'EXPENSE'
                                ? 'expense-categories-tab'
                                : 'income-categories-tab'
                        }
                    >
                        {loadState === 'loading' && (
                            <div
                                className="category-loading-state"
                                aria-label="Loading categories"
                            >
                                {[0, 1, 2, 3].map((item) => (
                                    <span key={item}/>
                                ))}
                            </div>
                        )}

                        {loadState === 'error' && (
                            <div
                                className="category-empty-state"
                                role="alert"
                            >
                                <span><Icon name="alert"/></span>
                                <h3>Categories could not be loaded</h3>
                                <p>{loadError}</p>
                                <button
                                    type="button"
                                    onClick={() => void loadCategories()}
                                >
                                    Try again
                                </button>
                            </div>
                        )}

                        {loadState === 'ready'
                            && visibleCategories.length === 0
                            && (
                                <div className="category-empty-state">
                                    <span>
                                        <Icon
                                            name={
                                                isStatusEmpty
                                                    ? selectedStatus === 'ACTIVE'
                                                        ? 'tag'
                                                        : 'trash'
                                                    : 'search'
                                            }
                                        />
                                    </span>
                                    <h3>{emptyStateTitle}</h3>
                                    <p>{emptyStateDescription}</p>
                                    {selectedStatus === 'ACTIVE'
                                        && activeCategories.length === 0
                                        && (
                                            <button
                                                type="button"
                                                onClick={(event) =>
                                                    openCategoryForm(
                                                        event.currentTarget,
                                                    )
                                                }
                                            >
                                                Add category
                                            </button>
                                        )}
                                </div>
                            )}

                        {loadState === 'ready'
                            && visibleCategories.length > 0
                            && (
                                <div className="category-grid">
                                    {visibleCategories.map((category) => (
                                        <CategoryCard
                                            category={category}
                                            currency={currency}
                                            isRestoring={
                                                restoringCategoryId === category.id
                                            }
                                            key={category.id}
                                            status={selectedStatus}
                                            onArchive={openArchiveDialog}
                                            onEdit={openEditForm}
                                            onRestore={(categoryToRestore) =>
                                                void handleCategoryRestore(
                                                    categoryToRestore,
                                                )
                                            }
                                        />
                                    ))}
                                </div>
                            )}
                    </div>

                    {loadState === 'ready' && (
                        <CategoryPagination
                            page={page}
                            pageSize={pageSize}
                            totalElements={totalElements}
                            totalPages={totalPages}
                            onPageChange={setPage}
                        />
                    )}

                </section>

                <CategoryAnalyticsPanels
                    analytics={analytics}
                    currency={currency}
                    loadError={analyticsLoadError}
                    loadState={analyticsLoadState}
                    selectedType={selectedType}
                    showCreateCategory={
                        loadState === 'ready'
                        && selectedStatus === 'ACTIVE'
                        && activeCategories.length > 0
                    }
                    onAddCategory={openCategoryForm}
                    onReviewUncategorized={
                        openUncategorizedTransactions
                    }
                    onRetry={() => void loadAnalytics()}
                />
            </main>

            {isFormOpen && (
                <CategoryFormModal
                    category={editingCategory ?? undefined}
                    onClose={closeCategoryForm}
                    onSaved={handleCategorySaved}
                    restoreFocus={() =>
                        restoreFocusRef.current?.focus()
                    }
                />
            )}

            {archiveDialog && (
                <CategoryArchiveDialog
                    category={archiveDialog.category}
                    onCancel={() => setArchiveDialog(null)}
                    onArchived={handleCategoryArchived}
                    restoreFocus={archiveDialog.restoreFocus}
                />
            )}

            {uncategorizedModal && analytics && (
                <UncategorizedTransactionsModal
                    analytics={analytics}
                    currency={currency}
                    month={month}
                    type={selectedType}
                    onAssigned={handleTransactionsAssigned}
                    onClose={() => setUncategorizedModal(null)}
                    restoreFocus={uncategorizedModal.restoreFocus}
                />
            )}
        </div>
    )
}
