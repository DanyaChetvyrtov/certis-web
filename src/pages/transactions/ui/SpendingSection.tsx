import {useTranslation} from 'react-i18next'
import type {Currency} from '../../../features/accounts/api/accountsApi'
import {Icon} from '../../../components/Icons'
import {Select, SelectOption} from '../../../components/Select'
import type {SpendingByCategory} from '../model/selectors'
import type {TransactionFilterState} from '../model/transactionFilters'
import {formatMoney} from './presentation'

export function SpendingSection({
    dateLabel, spendingCurrency, spendingCurrencyOptions,
    defaultSpendingCurrency, spendingByCategory, locale, updateFilters,
}: {
    dateLabel: string
    spendingCurrency: Currency
    spendingCurrencyOptions: Currency[]
    defaultSpendingCurrency: Currency
    spendingByCategory: SpendingByCategory
    locale: string
    updateFilters: (changes: Partial<TransactionFilterState>, replace?: boolean) => void
}) {
    const {t} = useTranslation()
    return (
                        <section className="spending-category-card">
                            <header>
                                <div>
                                    <h2>{t('transactions.spendingByCategory')}</h2>
                                    <p>{dateLabel}</p>
                                </div>
                                <div className="spending-category-summary">
                                    <Select
                                        className="spending-category-currency"
                                        aria-label="Spending currency"
                                        value={spendingCurrency}
                                        disabled={spendingCurrencyOptions.length < 2}
                                        onValueChange={(value) =>
                                            updateFilters({
                                                currency: value === defaultSpendingCurrency
                                                    ? null
                                                    : value as Currency,
                                            })
                                        }
                                    >
                                        {spendingCurrencyOptions.map((currency) => (
                                            <SelectOption key={currency} value={currency}>
                                                {currency}
                                            </SelectOption>
                                        ))}
                                    </Select>
                                    {spendingByCategory.items.length > 0 && (
                                        <strong>
                                            {formatMoney(
                                                spendingByCategory.total,
                                                spendingByCategory.currency,
                                                locale,
                                            )}
                                        </strong>
                                    )}
                                </div>
                            </header>

                            {spendingByCategory.items.length === 0 && (
                                <div className="spending-category-message">
                                    <Icon name="categories"/>
                                    <p>
                                        {t('transactions.categoriesEmpty')}
                                    </p>
                                </div>
                            )}

                            {spendingByCategory.items.length > 0 && (
                                <div className="spending-category-list">
                                    {spendingByCategory.items.map((item) => {
                                        const percentage = spendingByCategory.total
                                            ? Math.round(
                                                item.amount
                                                / spendingByCategory.total
                                                * 100,
                                            )
                                            : 0

                                        return (
                                            <div key={item.id}>
                                                <p>
                                                    <span>{item.name}</span>
                                                    <strong>
                                                        {formatMoney(
                                                            item.amount,
                                                            spendingByCategory.currency,
                                                            locale,
                                                        )} · {percentage}%
                                                    </strong>
                                                </p>
                                                <span className="spending-progress">
                                                    <i
                                                        style={{
                                                            width: `${percentage}%`,
                                                            backgroundColor: item.color,
                                                        }}
                                                    />
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </section>
    )
}
