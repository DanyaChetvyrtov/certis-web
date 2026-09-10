import {Select, SelectOption} from '../../../components/Select'
import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {getCashFlowAnalytics} from '../../transactions/api/transactionsApi'
import type {CashFlowAnalytics, CashFlowRange} from '../../transactions/api/transactionsApi'
import type {Currency} from '../../../shared/currency'
import {LoadingIndicator} from '../../../components/LoadingIndicator'
import {CashFlowChart} from './CashFlowChart'
import {useLanguage} from '../../../i18n/useLanguage'

const ranges: CashFlowRange[] = ['DAY', 'WEEK', 'MONTH', 'SIX_MONTHS', 'YEAR']

export function CashFlowPanel({currency, enabled, refreshRevision = 0}: {
    currency: Currency
    enabled: boolean
    refreshRevision?: number
}) {
    const {t} = useTranslation()
    const {locale} = useLanguage()
    const [range, setRange] = useState<CashFlowRange>('MONTH')
    const [revision, setRevision] = useState(0)
    const [result, setResult] = useState<{key: string; data?: CashFlowAnalytics; error?: boolean} | null>(null)
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const now = new Date()
    const anchorDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const key = JSON.stringify([range, currency, anchorDate, timeZone, revision, enabled, refreshRevision])

    useEffect(() => {
        if (!enabled) return
        let active = true
        void getCashFlowAnalytics({range, currency, anchorDate, timeZone}).then(
            data => { if (active) setResult({key, data}) },
            () => { if (active) setResult({key, error: true}) },
        )
        return () => { active = false }
    }, [range, currency, anchorDate, timeZone, key, enabled])

    const current = result?.key === key ? result : null
    const data = current?.data
    const money = (value: number) => new Intl.NumberFormat(locale, {
        style: 'currency', currency, currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(value)
    const dateOptions: Intl.DateTimeFormatOptions = data?.granularity === 'HOUR'
        ? {hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}
        : data?.granularity === 'DAY' ? {month: 'short', day: 'numeric'}
            : {month: 'short', year: '2-digit'}
    const formatter = new Intl.DateTimeFormat(locale, {...dateOptions, timeZone})

    return (
        <article className="dashboard-panel cash-flow-panel" aria-label={t('dashboard.cashFlow.title')}>
            <header className="dashboard-panel-header">
                <h2>{t('dashboard.cashFlow.title')}</h2>
                <Select aria-label={t('dashboard.cashFlow.rangeLabel')} value={range}
                    onValueChange={value => setRange(value as CashFlowRange)}>
                    {ranges.map(value => <SelectOption key={value} value={value}>{t(`dashboard.cashFlow.${value}`)}</SelectOption>)}
                </Select>
            </header>
            {!current && (
                <LoadingIndicator
                    label={t('dashboard.cashFlow.loading')}
                    layout="panel"
                    showLabel
                    size="medium"
                />
            )}
            {current?.error && <div className="accounts-error" role="alert">
                <p>{t('dashboard.cashFlow.error')}</p>
                <button type="button" onClick={() => setRevision(value => value + 1)}>{t('dashboard.tryAgain')}</button>
            </div>}
            {data && <>
                <div className="cash-flow-meta">
                    <div className="chart-legend">
                        <span className="legend-income"><i/>{t('dashboard.income')} <strong>{money(data.totals.income)}</strong></span>
                        <span className="legend-expenses"><i/>{t('dashboard.expenses')} <strong>{money(data.totals.expenses)}</strong></span>
                    </div>
                    <span className={`cash-flow-net${data.totals.netCashFlow < 0 ? ' cash-flow-net-negative' : ''}`}>
                        {t('dashboard.cashFlow.net', {amount: money(data.totals.netCashFlow)})}
                    </span>
                </div>
                <CashFlowChart currency={currency}
                    description={t('dashboard.cashFlow.description', {range: t(`dashboard.cashFlow.${range}`)})}
                    data={data.points.map(point => ({...point,
                        label: formatter.format(new Date(point.bucketStart)),
                    }))}/>
                {data.points.every(point => point.income === 0 && point.expenses === 0) &&
                    <p className="chart-empty-copy">{t('dashboard.cashFlow.empty')}</p>}
            </>}
        </article>
    )
}
