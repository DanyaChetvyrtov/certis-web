import {Select, SelectOption} from '../../../components/Select'
import type {CSSProperties} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import type {IconName} from '../../../components/Icons'
import type {Currency} from '../../../shared/currency'
import type {
    UncategorizedTransaction,
} from '../../transactions/api/transactionsApi'
import {
    isCategoryIcon,
} from '../api/categoriesApi'
import type {
    CategoryOption,
    CategoryType,
} from '../api/categoriesApi'
import {useLanguage} from '../../../i18n/useLanguage'

type UncategorizedTransactionRowProps = {
    categories: CategoryOption[]
    categoryId: string
    currency: Currency
    isOptionReady: boolean
    isSelected: boolean
    transaction: UncategorizedTransaction
    type: CategoryType
    onCategoryChange: (
        transactionId: string,
        categoryId: string,
    ) => void
    onSelectionChange: (
        transactionId: string,
        isSelected: boolean,
    ) => void
}

type CategorySelectStyle = CSSProperties & {
    '--assignment-accent': string
}

const accountIcons: Record<
    UncategorizedTransaction['account']['type'],
    IconName
> = {
    CASH: 'cash',
    BANK: 'bank',
    CARD: 'card',
    INVESTMENT: 'trend-up',
}

const formatMoney = (
    amount: number,
    currency: Currency,
    type: CategoryType,
    locale: string,
): string => {
    const formatted = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(Math.abs(amount))

    return `${type === 'EXPENSE' ? '−' : '+'}${formatted}`
}

export function UncategorizedTransactionRow({
    categories,
    categoryId,
    currency,
    isOptionReady,
    isSelected,
    transaction,
    type,
    onCategoryChange,
    onSelectionChange,
}: UncategorizedTransactionRowProps) {
    const {t} = useTranslation()
    const {locale} = useLanguage()
    const name = transaction.merchant?.trim()
        || transaction.note?.trim()
        || t('categories.uncategorized.untitled')
    const occurredAt = new Date(transaction.occurredAt)
    const selectedCategory = categories.find(
        (category) => category.id === categoryId,
    )
    const categoryStyle: CategorySelectStyle = {
        '--assignment-accent': selectedCategory?.color ?? '#10B981',
    }

    return (
        <article
            className={
                isSelected
                    ? 'uncategorized-transaction selected'
                    : 'uncategorized-transaction'
            }
        >
            <label className="uncategorized-select-row">
                <input
                    type="checkbox"
                    checked={isSelected}
                    aria-label={t('categories.uncategorized.selectName', {name})}
                    onChange={(event) =>
                        onSelectionChange(
                            transaction.id,
                            event.target.checked,
                        )
                    }
                />
                <span/>
            </label>

            <div className="uncategorized-transaction-copy">
                <time dateTime={transaction.occurredAt}>
                    <span>
                        {occurredAt.toLocaleDateString(locale, {
                            month: 'short',
                        })}
                    </span>
                    <strong>
                        {occurredAt.toLocaleDateString(locale, {
                            day: '2-digit',
                        })}
                    </strong>
                </time>
                <div>
                    <h4>{name}</h4>
                    <p>
                        {transaction.note || t('categories.uncategorized.noNote')} · {' '}
                        {occurredAt.toLocaleTimeString(locale, {
                            hour: 'numeric',
                            minute: '2-digit',
                        })}
                    </p>
                </div>
            </div>

            <div className="uncategorized-transaction-account">
                <span>
                    <Icon name={accountIcons[transaction.account.type]}/>
                </span>
                <div>
                    <strong>{transaction.account.name}</strong>
                    <p>{t(`dashboard.accountTypes.${transaction.account.type}`)}</p>
                </div>
            </div>

            <div
                className={
                    `uncategorized-transaction-amount ${type.toLowerCase()}`
                }
            >
                <strong>
                    {formatMoney(transaction.amount, currency, type, locale)}
                </strong>
                <p>{t(`categories.type.${type}`)}</p>
            </div>

            <label
                className="uncategorized-category-field"
                style={categoryStyle}
            >
                <span className="sr-only">{t('categories.uncategorized.categoryFor', {name})}</span>
                {selectedCategory && (
                    <Icon
                        name={
                            isCategoryIcon(selectedCategory.icon)
                                ? selectedCategory.icon
                                : 'tag'
                        }
                    />
                )}
                <Select
                    aria-label={t('categories.uncategorized.categoryFor', {name})}
                    value={categoryId}
                    disabled={!isOptionReady || categories.length === 0}
                    onValueChange={(value) =>
                        onCategoryChange(
                            transaction.id,
                            value,
                        )
                    }
                >
                    <SelectOption value="">{t('categories.uncategorized.chooseCategory')}</SelectOption>
                    {categories.map((category) => (
                        <SelectOption value={category.id} key={category.id}>
                            {category.name}
                        </SelectOption>
                    ))}
                </Select>
            </label>
        </article>
    )
}
