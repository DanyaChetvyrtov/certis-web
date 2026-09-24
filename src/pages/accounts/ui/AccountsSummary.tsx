import {useTranslation} from 'react-i18next'
import {Select, SelectOption} from '../../../components/Select'
import {currencies} from '../../../features/accounts/api/accountsApi'
import type {Currency} from '../../../features/accounts/api/accountsApi'
import {useLanguage} from '../../../i18n/useLanguage'
import type {selectAccountSummary} from '../model/accountSelectors'
import {formatAmount, typeColors} from './accountPresentation'

type Summary = ReturnType<typeof selectAccountSummary>

type AccountsSummaryProps = {
    currency: Currency
    onCurrencyChange: (currency: Currency) => void
    activeCount: number
    closedCount: number
    totalBalance: number
    balanceByType: Summary['balanceByType']
}

export function AccountsSummary({
    currency,
    onCurrencyChange,
    activeCount,
    closedCount,
    totalBalance,
    balanceByType,
}: AccountsSummaryProps) {
    const {t} = useTranslation()
    const {locale} = useLanguage()

    return (
        <section className="accounts-summary-card" aria-label={t('accounts.balanceSummary')}>
            <div className="total-balance-panel">
                <p>{t('accounts.totalBalance', {currency})}</p>
                <strong>{formatAmount(totalBalance, currency, locale, 0)}</strong>
                <div className="account-counts">
                    <span><i/>{t('accounts.activeCount', {count: activeCount})}</span>
                    <span>{t('accounts.closedCount', {count: closedCount})}</span>
                </div>
                <small>{t('accounts.totalHint')}</small>
            </div>

            <div className="balance-type-panel">
                <div className="balance-type-heading">
                    <p>{t('accounts.balanceByType')}</p>
                    <label>
                        <span className="sr-only">{t('accounts.summaryCurrency')}</span>
                        <Select
                            value={currency}
                            onValueChange={(value) => onCurrencyChange(value as Currency)}
                        >
                            {currencies.map((item) => <SelectOption value={item} key={item}>{item}</SelectOption>)}
                        </Select>
                    </label>
                </div>

                {balanceByType.length === 0 ? (
                    <div className="balance-type-empty">
                        {t('accounts.noActiveCurrency', {currency})}
                    </div>
                ) : (
                    <div className="balance-type-list">
                        {balanceByType.map((item) => (
                            <div className="balance-type-row" key={item.type}>
                                <span>{t(`accounts.types.${item.type}`)}</span>
                                <span className="balance-type-track">
                                    <i style={{
                                        width: `${item.percentage}%`,
                                        background: typeColors[item.type],
                                    }}/>
                                </span>
                                <strong>{formatAmount(item.balance, currency, locale, 0)}</strong>
                                <small>{item.percentage}%</small>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}
