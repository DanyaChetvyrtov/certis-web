import {Select, SelectOption} from '../../../components/Select'
import type {RefObject} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import {
    currencies,
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
    const {t} = useTranslation()

    return (
        <>
            <header className="categories-card-heading">
                <div>
                    <h2>{t('categories.controls.title')}</h2>
                    <p>{t('categories.controls.description')}</p>
                </div>

                <div
                    className="category-status-tabs"
                    role="group"
                    aria-label={t('categories.controls.status')}
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
                        {t('categories.controls.active', {count: activeCount})}
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
                        {t('categories.controls.archived', {count: archivedCount})}
                    </button>
                </div>
            </header>

            <div className="categories-toolbar">
                <div
                    className="category-type-tabs"
                    role="tablist"
                    aria-label={t('categories.controls.type')}
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
                        {t('categories.controls.expenses', {count: categoryCounts.EXPENSE})}
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
                        {t('categories.controls.income', {count: categoryCounts.INCOME})}
                    </button>
                </div>

                <div className="category-toolbar-actions">
                    <label className="category-currency-field">
                        <span>{t('categories.controls.currency')}</span>
                        <Select
                            aria-label={t('categories.controls.statisticsCurrency')}
                            value={currency}
                            onValueChange={(value) =>
                                onCurrencyChange(
                                    value as Currency,
                                )
                            }
                        >
                            {currencies.map((item) => (
                                <SelectOption value={item} key={item}>
                                    {item} · {t(`currencies.${item}`)}
                                </SelectOption>
                            ))}
                        </Select>
                    </label>

                    <label className="category-search-field">
                        <Icon name="search"/>
                        <span className="sr-only">
                            {t('categories.controls.search')}
                        </span>
                        <input
                            type="search"
                            placeholder={
                                selectedStatus === 'ACTIVE'
                                    ? t('categories.controls.search')
                                    : t('categories.controls.searchArchived')
                            }
                            value={searchQuery}
                            onChange={(event) =>
                                onSearchQueryChange(event.target.value)
                            }
                        />
                    </label>

                    <label className="category-sort-field">
                        <span className="sr-only">{t('categories.controls.sort')}</span>
                        <Select
                            aria-label={t('categories.controls.sort')}
                            value={selectedSort}
                            onValueChange={(value) =>
                                onSortChange(
                                    value as CategoryCardSort,
                                )
                            }
                        >
                            <SelectOption value="AMOUNT_DESC">{t('categories.controls.mostSpent')}</SelectOption>
                            <SelectOption value="AMOUNT_ASC">{t('categories.controls.leastSpent')}</SelectOption>
                            <SelectOption value="NAME">{t('categories.controls.name')}</SelectOption>
                        </Select>
                    </label>
                </div>
            </div>
        </>
    )
}
