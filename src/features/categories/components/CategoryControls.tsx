import {Select, SelectOption} from '../../../components/Select'
import type {RefObject} from 'react'
import {Icon} from '../../../components/Icons'
import {
    currencies,
    currencyLabels,
} from '../../../shared/currency'
import type {Currency} from '../../../shared/currency'
import type {
    CategoryCardSort,
    CategoryType,
} from '../api/categoriesApi'

export type CategoryStatus =
    | 'ACTIVE'
    | 'ARCHIVED'

type CategoryCounts = Record<CategoryType, number>

type CategoryControlsProps = {
    activeCount: number
    activeStatusRef: RefObject<HTMLButtonElement | null>
    archivedCount: number
    archivedStatusRef: RefObject<HTMLButtonElement | null>
    categoryCounts: CategoryCounts
    currency: Currency
    searchQuery: string
    selectedSort: CategoryCardSort
    selectedStatus: CategoryStatus
    selectedType: CategoryType
    onCurrencyChange: (currency: Currency) => void
    onSearchQueryChange: (searchQuery: string) => void
    onSortChange: (sort: CategoryCardSort) => void
    onStatusChange: (status: CategoryStatus) => void
    onTypeChange: (type: CategoryType) => void
}

export function CategoryControls({
    activeCount,
    activeStatusRef,
    archivedCount,
    archivedStatusRef,
    categoryCounts,
    currency,
    searchQuery,
    selectedSort,
    selectedStatus,
    selectedType,
    onCurrencyChange,
    onSearchQueryChange,
    onSortChange,
    onStatusChange,
    onTypeChange,
}: CategoryControlsProps) {
    return (
        <>
            <header className="categories-card-heading">
                <div>
                    <h2>Your categories</h2>
                    <p>
                        Keep transactions consistent with a reusable set.
                        {' '}Counts reflect the current page.
                    </p>
                </div>

                <div
                    className="category-status-tabs"
                    role="group"
                    aria-label="Category status"
                >
                    <button
                        ref={activeStatusRef}
                        className={
                            selectedStatus === 'ACTIVE'
                                ? 'active'
                                : undefined
                        }
                        type="button"
                        aria-pressed={selectedStatus === 'ACTIVE'}
                        onClick={() => onStatusChange('ACTIVE')}
                    >
                        Active · {activeCount}
                    </button>
                    <button
                        ref={archivedStatusRef}
                        className={
                            selectedStatus === 'ARCHIVED'
                                ? 'active'
                                : undefined
                        }
                        type="button"
                        aria-pressed={selectedStatus === 'ARCHIVED'}
                        onClick={() => onStatusChange('ARCHIVED')}
                    >
                        Archived · {archivedCount}
                    </button>
                </div>
            </header>

            <div className="categories-toolbar">
                <div
                    className="category-type-tabs"
                    role="tablist"
                    aria-label="Category type"
                >
                    <button
                        id="expense-categories-tab"
                        className={
                            selectedType === 'EXPENSE'
                                ? 'active'
                                : undefined
                        }
                        type="button"
                        role="tab"
                        aria-selected={selectedType === 'EXPENSE'}
                        aria-controls="category-list"
                        onClick={() => onTypeChange('EXPENSE')}
                    >
                        Expenses · {categoryCounts.EXPENSE}
                    </button>

                    <button
                        id="income-categories-tab"
                        className={
                            selectedType === 'INCOME'
                                ? 'active'
                                : undefined
                        }
                        type="button"
                        role="tab"
                        aria-selected={selectedType === 'INCOME'}
                        aria-controls="category-list"
                        onClick={() => onTypeChange('INCOME')}
                    >
                        Income · {categoryCounts.INCOME}
                    </button>
                </div>

                <div className="category-toolbar-actions">
                    <label className="category-currency-field">
                        <span>Currency</span>
                        <Select
                            aria-label="Statistics currency"
                            value={currency}
                            onValueChange={(value) =>
                                onCurrencyChange(
                                    value as Currency,
                                )
                            }
                        >
                            {currencies.map((item) => (
                                <SelectOption value={item} key={item}>
                                    {item} · {currencyLabels[item]}
                                </SelectOption>
                            ))}
                        </Select>
                    </label>

                    <label className="category-search-field">
                        <Icon name="search"/>
                        <span className="sr-only">
                            Search categories
                        </span>
                        <input
                            type="search"
                            placeholder={
                                selectedStatus === 'ACTIVE'
                                    ? 'Search categories'
                                    : 'Search archived categories'
                            }
                            value={searchQuery}
                            onChange={(event) =>
                                onSearchQueryChange(event.target.value)
                            }
                        />
                    </label>

                    <label className="category-sort-field">
                        <span className="sr-only">Sort categories</span>
                        <Select
                            aria-label="Sort categories"
                            value={selectedSort}
                            onValueChange={(value) =>
                                onSortChange(
                                    value as CategoryCardSort,
                                )
                            }
                        >
                            <SelectOption value="AMOUNT_DESC">Most spent</SelectOption>
                            <SelectOption value="AMOUNT_ASC">Least spent</SelectOption>
                            <SelectOption value="NAME">Name</SelectOption>
                        </Select>
                    </label>
                </div>
            </div>
        </>
    )
}
