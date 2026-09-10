import type {CSSProperties} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import type {Currency} from '../../../shared/currency'
import {
    isCategoryIcon,
} from '../api/categoriesApi'
import type {
    Category,
    CategoryCard as CategoryCardModel,
} from '../api/categoriesApi'
import type {CategoryStatus} from './CategoryControls'
import {useLanguage} from '../../../i18n/useLanguage'

type CategoryAccentStyle = CSSProperties & {
    '--category-accent': string
    '--category-progress': string
}

type CategoryCardProps = {
    category: CategoryCardModel
    currency: Currency
    isRestoring: boolean
    status: CategoryStatus
    onArchive: (
        category: Category,
        restoreFocusTarget: HTMLButtonElement,
    ) => void
    onEdit: (
        category: Category,
        restoreFocusTarget: HTMLButtonElement,
    ) => void
    onRestore: (category: Category) => void
}

const accentStyle = (
    color: string,
    percentage: number,
): CategoryAccentStyle => ({
    '--category-accent': color,
    '--category-progress': `${Math.min(Math.max(percentage, 0), 100)}%`,
})

const formatMoney = (
    amount: number,
    currency: Currency,
    locale: string,
): string =>
    new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        maximumFractionDigits: 0,
    }).format(amount)

export function CategoryCard({
    category,
    currency,
    isRestoring,
    status,
    onArchive,
    onEdit,
    onRestore,
}: CategoryCardProps) {
    const {t} = useTranslation()
    const {locale} = useLanguage()
    const isArchived = status === 'ARCHIVED'

    return (
        <article
            className={
                isArchived
                    ? 'category-item archived'
                    : 'category-item'
            }
            style={accentStyle(
                category.color,
                category.monthlySharePercentage,
            )}
        >
            <div className="category-item-heading">
                <span className="category-item-icon">
                    <Icon
                        name={
                            isCategoryIcon(category.icon)
                                ? category.icon
                                : 'tag'
                        }
                    />
                </span>
                <div className="category-item-copy">
                    <h3>{category.name}</h3>
                    <p>
                        {t('categories.card.transactions', {
                            count: category.monthlyTransactionCount,
                        })}
                    </p>
                </div>
                <div className="category-item-actions">
                    {!isArchived && (
                        <button
                            className="category-item-action edit"
                            type="button"
                            aria-label={t('categories.card.editLabel', {name: category.name})}
                            onClick={(event) =>
                                onEdit(category, event.currentTarget)
                            }
                        >
                            <Icon name="edit"/>
                            {t('categories.card.edit')}
                        </button>
                    )}
                    <button
                        className={
                            isArchived
                                ? 'category-item-action restore'
                                : 'category-item-action archive'
                        }
                        type="button"
                        disabled={isRestoring}
                        aria-label={
                            isArchived
                                ? t('categories.card.restoreLabel', {name: category.name})
                                : t('categories.card.archiveLabel', {name: category.name})
                        }
                        onClick={(event) => {
                            if (isArchived) {
                                onRestore(category)
                                return
                            }

                            onArchive(category, event.currentTarget)
                        }}
                    >
                        <Icon
                            name={isArchived ? 'repeat' : 'trash'}
                        />
                        {isArchived
                            ? isRestoring
                                ? t('categories.card.restoring')
                                : t('categories.card.restore')
                            : t('categories.card.archive')}
                    </button>
                </div>
            </div>

            <div className="category-item-stats">
                <span>{t('categories.card.thisMonth')}</span>
                <div>
                    <strong>
                        {formatMoney(category.monthlyAmount, currency, locale)}
                    </strong>
                    <b>
                        {category.monthlySharePercentage.toFixed(0)}%
                    </b>
                </div>
                <div
                    className="category-item-progress"
                    role="progressbar"
                    aria-label={t('categories.card.share', {name: category.name})}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={category.monthlySharePercentage}
                >
                    <span/>
                </div>
            </div>

            {isArchived && (
                <p className="category-item-archive-note">
                    {t('categories.card.archivedNote')}
                </p>
            )}
        </article>
    )
}
