import {Select, SelectOption} from '../../../components/Select'
import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {getCashFlowAnalytics} from '../../transactions/api/transactionsApi'
import type {CashFlowAnalytics, CashFlowRange} from '../../transactions/api/transactionsApi'
import type {Currency} from '../../../shared/currency'
import {LoadingIndicator} from '../../../components/LoadingIndicator'
import {CashFlowChart} from './CashFlowChart'
import {useLanguage} from '../../../i18n/useLanguage'
import './CashFlowPanel.css'

const ranges: CashFlowRange[] = ['DAY', 'WEEK', 'MONTH', 'SIX_MONTHS', 'YEAR']

type AnalyticsResult = {
    key: string
    data?: CashFlowAnalytics
    error?: boolean
}

const formatDate = (date: Date): string =>
    `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`

const getPreviousAnchorDate = (
    anchorDate: string,
    range: CashFlowRange,
): string => {
    const [year, month, day] = anchorDate.split('-').map(Number)
    const previous = new Date(Date.UTC(year, month - 1, day))

    switch (range) {
        case 'DAY':
            previous.setUTCDate(previous.getUTCDate() - 1)
            break
        case 'WEEK':
            previous.setUTCDate(previous.getUTCDate() - 7)
            break
        case 'MONTH':
            previous.setUTCDate(1)
            previous.setUTCMonth(previous.getUTCMonth() - 1)
            break
        case 'SIX_MONTHS':
            previous.setUTCDate(1)
            previous.setUTCMonth(previous.getUTCMonth() - 6)
            break
        case 'YEAR':
            previous.setUTCDate(1)
            previous.setUTCMonth(previous.getUTCMonth() - 12)
            break
    }

    return formatDate(previous)
}

export function CashFlowPanel({currency, enabled, refreshRevision = 0}: {
    currency: Currency
    enabled: boolean
    refreshRevision?: number
}) {
    const {t} = useTranslation()
    const {locale} = useLanguage()
    const [range, setRange] = useState<CashFlowRange>('MONTH')
    const [comparePrevious, setComparePrevious] = useState(false)
    const [revision, setRevision] = useState(0)
    const [result, setResult] = useState<AnalyticsResult | null>(null)
    const [comparisonResult, setComparisonResult] = useState<AnalyticsResult | null>(null)
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const now = new Date()
    const anchorDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const previousAnchorDate = getPreviousAnchorDate(anchorDate, range)
    const key = JSON.stringify([range, currency, anchorDate, timeZone, revision, enabled, refreshRevision])
    const comparisonKey = JSON.stringify([
        range,
        currency,
        previousAnchorDate,
        timeZone,
        revision,
        enabled,
        refreshRevision,
        comparePrevious,
    ])

    useEffect(() => {
        if (!enabled) return
        let active = true
        void getCashFlowAnalytics({range, currency, anchorDate, timeZone}).then(
            data => { if (active) setResult({key, data}) },
            () => { if (active) setResult({key, error: true}) },
        )
        return () => { active = false }
    }, [range, currency, anchorDate, timeZone, key, enabled])

    useEffect(() => {
        if (!enabled || !comparePrevious) return

        let active = true
        void getCashFlowAnalytics({
            range,
            currency,
            anchorDate: previousAnchorDate,
            timeZone,
        }).then(
            data => { if (active) setComparisonResult({key: comparisonKey, data}) },
            () => { if (active) setComparisonResult({key: comparisonKey, error: true}) },
        )

        return () => { active = false }
    }, [
        range,
        currency,
        previousAnchorDate,
        timeZone,
        comparisonKey,
        enabled,
        comparePrevious,
    ])

    const current = result?.key === key ? result : null
    const comparison = comparePrevious && comparisonResult?.key === comparisonKey
        ? comparisonResult
        : null
    const data = current?.data
    const comparisonData = comparison?.data
    const comparisonLoading = enabled && comparePrevious && comparison === null
    const money = (value: number) => new Intl.NumberFormat(locale, {
        style: 'currency', currency, currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(value)
    const dateOptions: Intl.DateTimeFormatOptions = data?.granularity === 'HOUR'
        ? {hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}
        : data?.granularity === 'DAY' ? {month: 'short', day: 'numeric'}
            : {month: 'short', year: '2-digit'}
    const formatter = new Intl.DateTimeFormat(locale, {...dateOptions, timeZone})

    const toggleComparison = () => {
        if (comparePrevious) {
            setComparisonResult(null)
        }
        setComparePrevious(value => !value)
    }

    return (
        <article className="dashboard-panel cash-flow-panel" aria-label={t('dashboard.cashFlow.title')}>
            <header className="dashboard-panel-header">
                <h2>{t('dashboard.cashFlow.title')}</h2>
                <div className="cash-flow-controls">
                    <button
                        type="button"
                        className="cash-flow-comparison-toggle"
                        role="switch"
                        aria-checked={comparePrevious}
                        aria-label={t('dashboard.cashFlow.comparePrevious')}
                        onClick={toggleComparison}
                    >
                        <span>{t('dashboard.cashFlow.previousPeriod')}</span>
                        <i className="cash-flow-switch" aria-hidden="true"><span/></i>
                    </button>
                    <Select aria-label={t('dashboard.cashFlow.rangeLabel')} value={range}
                        onValueChange={value => setRange(value as CashFlowRange)}>
                        {ranges.map(value => <SelectOption key={value} value={value}>{t(`dashboard.cashFlow.${value}`)}</SelectOption>)}
                    </Select>
                </div>
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
                        {comparisonData && (
                            <span className="cash-flow-previous-key">
                                <i/>{t('dashboard.cashFlow.previousPeriod')}
                            </span>
                        )}
                    </div>
                    <span className={`cash-flow-net${data.totals.netCashFlow < 0 ? ' cash-flow-net-negative' : ''}`}>
                        {t('dashboard.cashFlow.net', {amount: money(data.totals.netCashFlow)})}
                    </span>
                </div>
                <CashFlowChart
                    currency={currency}
                    description={t(
                        comparePrevious && comparisonData
                            ? 'dashboard.cashFlow.descriptionCompared'
                            : 'dashboard.cashFlow.description',
                        {range: t(`dashboard.cashFlow.${range}`)},
                    )}
                    data={data.points.map(point => ({...point,
                        label: formatter.format(new Date(point.bucketStart)),
                    }))}
                    comparisonData={comparisonData?.points}
                />
                {comparisonLoading && (
                    <p className="cash-flow-comparison-status">
                        {t('dashboard.cashFlow.loadingPrevious')}
                    </p>
                )}
                {comparison?.error && (
                    <div className="cash-flow-comparison-status error" role="status">
                        <span>{t('dashboard.cashFlow.previousError')}</span>
                        <button type="button" onClick={() => setRevision(value => value + 1)}>
                            {t('dashboard.tryAgain')}
                        </button>
                    </div>
                )}
                {data.points.every(point => point.income === 0 && point.expenses === 0) &&
                    <p className="chart-empty-copy">{t('dashboard.cashFlow.empty')}</p>}
            </>}
        </article>
    )
}
