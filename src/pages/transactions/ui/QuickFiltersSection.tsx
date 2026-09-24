import type {RefObject} from 'react'
import {useTranslation} from 'react-i18next'
import type {Account} from '../../../features/accounts/api/accountsApi'
import type {Category} from '../../../features/categories/api/categoriesApi'
import {DateTimeField} from '../../../components/DateTimeField'
import {Icon} from '../../../components/Icons'
import {Select, SelectOption} from '../../../components/Select'
import {getDefaultTransactionFilters, hasActiveTransactionFilters, periodPresets} from '../model/transactionFilters'
import type {CustomPeriod, PeriodPreset, TransactionFilterState} from '../model/transactionFilters'

export function QuickFiltersSection({
    quickFiltersRef, period, customPeriod, lastCustomPeriod,
    setLastCustomPeriod, customPeriodDraft, setCustomPeriodDraft,
    canApplyCustomPeriod, customPeriodIsReversed, accountFilter,
    categoryFilter, accounts, categories, canonicalFilters, anchorDate,
    updateFilters,
}: {
    quickFiltersRef: RefObject<HTMLElement | null>
    period: PeriodPreset
    customPeriod: CustomPeriod
    lastCustomPeriod: CustomPeriod
    setLastCustomPeriod: (value: CustomPeriod) => void
    customPeriodDraft: CustomPeriod
    setCustomPeriodDraft: (value: CustomPeriod) => void
    canApplyCustomPeriod: boolean
    customPeriodIsReversed: boolean
    accountFilter: string
    categoryFilter: string
    accounts: Account[]
    categories: Category[]
    canonicalFilters: TransactionFilterState
    anchorDate: Date
    updateFilters: (changes: Partial<TransactionFilterState>, replace?: boolean) => void
}) {
    const {t} = useTranslation()
    return (
                        <section
                            ref={quickFiltersRef}
                            className="transaction-quick-filters"
                        >
                            <header>
                                <h2>{t('transactions.quickFilters')}</h2>
                                <p>{t('transactions.quickFiltersSubtitle')}</p>
                            </header>

                            <label htmlFor="transaction-period-filter">
                                {t('transactions.period')}
                            </label>
                            <div className="quick-filter-select wide">
                                <Icon name="calendar"/>
                                <Select
                                    id="transaction-period-filter"
                                    value={period}
                                    onValueChange={(value) => {
                                        const nextPeriod =
                                            value as PeriodPreset

                                        if (nextPeriod === 'CUSTOM') {
                                            setCustomPeriodDraft(
                                                lastCustomPeriod,
                                            )
                                            updateFilters({
                                                period: nextPeriod,
                                                customPeriod: lastCustomPeriod,
                                            })
                                        } else {
                                            if (period === 'CUSTOM') {
                                                setLastCustomPeriod(customPeriod)
                                            }
                                            updateFilters({period: nextPeriod})
                                        }
                                    }}
                                >
                                    {periodPresets
                                        .map((value) => (
                                            <SelectOption value={value} key={value}>
                                                {t(`transactions.periods.${value}`)}
                                            </SelectOption>
                                        ))}
                                </Select>
                            </div>

                            {period === 'CUSTOM' && (
                                <form
                                    className="custom-period-filter"
                                    onSubmit={(event) => {
                                        event.preventDefault()

                                        if (canApplyCustomPeriod) {
                                            setLastCustomPeriod(
                                                customPeriodDraft,
                                            )
                                            updateFilters({
                                                customPeriod: customPeriodDraft,
                                            })
                                        }
                                    }}
                                >
                                    <label htmlFor="transaction-custom-from">
                                        <span>{t('transactions.from')}</span>
                                        <DateTimeField
                                            id="transaction-custom-from"
                                            value={customPeriodDraft.from}
                                            mode="date"
                                            max={customPeriodDraft.to || undefined}
                                            onChange={(value) =>
                                                setCustomPeriodDraft({
                                                    ...customPeriodDraft,
                                                    from: value,
                                                })
                                            }
                                        />
                                    </label>

                                    <label htmlFor="transaction-custom-to">
                                        <span>{t('transactions.to')}</span>
                                        <DateTimeField
                                            id="transaction-custom-to"
                                            value={customPeriodDraft.to}
                                            mode="date"
                                            min={customPeriodDraft.from || undefined}
                                            onChange={(value) =>
                                                setCustomPeriodDraft({
                                                    ...customPeriodDraft,
                                                    to: value,
                                                })
                                            }
                                        />
                                    </label>

                                    <button
                                        type="submit"
                                        disabled={!canApplyCustomPeriod}
                                    >
                                        {t('transactions.applyRange')}
                                    </button>

                                    {customPeriodIsReversed && (
                                        <p role="alert">
                                            {t('transactions.invalidRange')}
                                        </p>
                                    )}
                                </form>
                            )}

                            <label htmlFor="transaction-account-filter">
                                {t('transactions.account')}
                            </label>
                            <div className="quick-filter-grid">
                                <div className="quick-filter-select">
                                    <Icon name="card"/>
                                    <Select
                                        id="transaction-account-filter"
                                        value={accountFilter}
                                        onValueChange={(value) =>
                                            updateFilters({accountId: value})
                                        }
                                    >
                                        <SelectOption value="">{t('transactions.allAccounts')}</SelectOption>
                                        {accounts.map((account) => (
                                            <SelectOption
                                                value={account.id}
                                                key={account.id}
                                            >
                                                {account.name} · {account.currency}
                                            </SelectOption>
                                        ))}
                                    </Select>
                                </div>

                                <div className="quick-filter-select">
                                    <Icon name="tag"/>
                                    <Select
                                        aria-label={t('transactions.categoryFilter')}
                                        value={categoryFilter}
                                        onValueChange={(value) =>
                                            updateFilters({categoryId: value})
                                        }
                                    >
                                        <SelectOption value="">{t('transactions.allCategories')}</SelectOption>
                                        {categories.map((category) => (
                                            <SelectOption
                                                value={category.id}
                                                key={category.id}
                                            >
                                                {category.name}
                                            </SelectOption>
                                        ))}
                                    </Select>
                                </div>
                            </div>

                            {hasActiveTransactionFilters(canonicalFilters)
                                && (
                                    <button
                                        className="clear-transaction-filters"
                                        type="button"
                                        onClick={() => {
                                            const defaults =
                                                getDefaultTransactionFilters(anchorDate)

                                            setLastCustomPeriod(defaults.customPeriod)
                                            setCustomPeriodDraft(defaults.customPeriod)
                                            updateFilters(defaults)
                                        }}
                                    >
                                        {t('transactions.clearFilters')}
                                    </button>
                                )}
                        </section>
    )
}
