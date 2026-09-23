import {useTranslation} from 'react-i18next'
import type {Currency} from '../../../features/accounts/api/accountsApi'
import {Icon} from '../../../components/Icons'
import type {TransactionMetrics} from '../model/selectors'
import {formatMoneyMap} from './presentation'

export function MetricsSection({metrics, locale, fallbackCurrency}: {
    metrics: TransactionMetrics
    locale: string
    fallbackCurrency?: Currency
}) {
    const {t} = useTranslation()
    return (
                <section
                    className="transaction-metrics"
                    aria-label={t('transactions.summary')}
                >
                    <article>
                        <span className="metric-icon income">
                            <Icon name="cash"/>
                        </span>
                        <div>
                            <p>{t('transactions.income')}</p>
                            <strong>
                                {formatMoneyMap(
                                    metrics.income,
                                    locale,
                                    fallbackCurrency,
                                )}
                            </strong>
                            <small className="income">
                                {t('transactions.count', {count: metrics.incomeCount})}
                            </small>
                        </div>
                    </article>

                    <article>
                        <span className="metric-icon expense">
                            <Icon name="wallet"/>
                        </span>
                        <div>
                            <p>{t('transactions.expenses')}</p>
                            <strong>
                                {formatMoneyMap(
                                    metrics.expenses,
                                    locale,
                                    fallbackCurrency,
                                )}
                            </strong>
                            <small className="expense">
                                {t('transactions.count', {count: metrics.expenseCount})}
                            </small>
                        </div>
                    </article>

                    <article>
                        <span className="metric-icon income">
                            <Icon name="repeat"/>
                        </span>
                        <div>
                            <p>{t('transactions.netCashFlow')}</p>
                            <strong>
                                {formatMoneyMap(
                                    metrics.cashFlow,
                                    locale,
                                    fallbackCurrency,
                                    true,
                                )}
                            </strong>
                            <small>
                                {t('transactions.selectedPeriod')}
                            </small>
                        </div>
                    </article>

                    <article>
                        <span className="metric-icon average">
                            <Icon name="gauge"/>
                        </span>
                        <div>
                            <p>{t('transactions.averageSpend')}</p>
                            <strong>
                                {formatMoneyMap(
                                    metrics.averageSpend,
                                    locale,
                                    fallbackCurrency,
                                )}
                            </strong>
                            <small className="average">
                                {t('transactions.perExpense')}
                            </small>
                        </div>
                    </article>
                </section>
    )
}
