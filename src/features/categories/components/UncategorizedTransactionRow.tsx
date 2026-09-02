import type {CSSProperties} from 'react'
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
): string => {
    const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(Math.abs(amount))

    return `${type === 'EXPENSE' ? '−' : '+'}${formatted}`
}

const transactionName = (
    transaction: UncategorizedTransaction,
): string =>
    transaction.merchant?.trim()
    || transaction.note?.trim()
    || 'Untitled transaction'

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
    const name = transactionName(transaction)
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
                    aria-label={`Select ${name}`}
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
                        {occurredAt.toLocaleDateString('en-US', {
                            month: 'short',
                        })}
                    </span>
                    <strong>
                        {occurredAt.toLocaleDateString('en-US', {
                            day: '2-digit',
                        })}
                    </strong>
                </time>
                <div>
                    <h4>{name}</h4>
                    <p>
                        {transaction.note || 'No note'} · {' '}
                        {occurredAt.toLocaleTimeString('en-US', {
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
                    <p>{transaction.account.type.toLocaleLowerCase()}</p>
                </div>
            </div>

            <div className="uncategorized-transaction-amount">
                <strong>
                    {formatMoney(transaction.amount, currency, type)}
                </strong>
                <p>{type === 'EXPENSE' ? 'Expense' : 'Income'}</p>
            </div>

            <label
                className="uncategorized-category-field"
                style={categoryStyle}
            >
                <span className="sr-only">Category for {name}</span>
                {selectedCategory && (
                    <Icon
                        name={
                            isCategoryIcon(selectedCategory.icon)
                                ? selectedCategory.icon
                                : 'tag'
                        }
                    />
                )}
                <select
                    aria-label={`Category for ${name}`}
                    value={categoryId}
                    disabled={!isOptionReady || categories.length === 0}
                    onChange={(event) =>
                        onCategoryChange(
                            transaction.id,
                            event.target.value,
                        )
                    }
                >
                    <option value="">Choose category</option>
                    {categories.map((category) => (
                        <option value={category.id} key={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>
            </label>
        </article>
    )
}
