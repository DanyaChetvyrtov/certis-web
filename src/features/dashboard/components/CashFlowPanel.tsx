import {useEffect, useState} from 'react'
import {getCashFlowAnalytics} from '../../transactions/api/transactionsApi'
import type {CashFlowAnalytics, CashFlowRange} from '../../transactions/api/transactionsApi'
import type {Currency} from '../../../shared/currency'
import {CashFlowChart} from './CashFlowChart'

const ranges: [CashFlowRange, string][] = [
    ['DAY', 'Day'], ['WEEK', 'Week'], ['MONTH', 'Month'],
    ['SIX_MONTHS', '6 months'], ['YEAR', 'Year'],
]

export function CashFlowPanel({currency, enabled, refreshRevision = 0}: {
    currency: Currency
    enabled: boolean
    refreshRevision?: number
}) {
    const [range, setRange] = useState<CashFlowRange>('SIX_MONTHS')
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
    const money = (value: number) => new Intl.NumberFormat('en-US', {
        style: 'currency', currency, currencyDisplay: 'narrowSymbol', minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(value)
    const dateOptions: Intl.DateTimeFormatOptions = data?.granularity === 'HOUR'
        ? {hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}
        : data?.granularity === 'DAY' ? {month: 'short', day: 'numeric'}
            : {month: 'short', year: '2-digit'}
    const formatter = new Intl.DateTimeFormat('en-US', {...dateOptions, timeZone})

    return (
        <article className="dashboard-panel cash-flow-panel" aria-label="Cash flow">
            <header className="dashboard-panel-header">
                <h2>Cash flow</h2>
                <select aria-label="Cash flow range" value={range}
                    onChange={event => setRange(event.target.value as CashFlowRange)}>
                    {ranges.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
            </header>
            {!current && <p role="status">Loading cash flow…</p>}
            {current?.error && <div className="accounts-error" role="alert">
                <p>We could not load cash flow.</p>
                <button type="button" onClick={() => setRevision(value => value + 1)}>Try again</button>
            </div>}
            {data && <>
                <div className="cash-flow-meta">
                    <div className="chart-legend">
                        <span className="legend-income"><i/>Income <strong>{money(data.totals.income)}</strong></span>
                        <span className="legend-expenses"><i/>Expenses <strong>{money(data.totals.expenses)}</strong></span>
                    </div>
                    <span className={`cash-flow-net${data.totals.netCashFlow < 0 ? ' cash-flow-net-negative' : ''}`}>
                        Net {money(data.totals.netCashFlow)}
                    </span>
                </div>
                <CashFlowChart currency={currency}
                    description={`Income and expenses: ${ranges.find(([value]) => value === range)?.[1]}`}
                    data={data.points.map(point => ({...point,
                        label: formatter.format(new Date(point.bucketStart)),
                    }))}/>
                {data.points.every(point => point.income === 0 && point.expenses === 0) &&
                    <p className="chart-empty-copy">No income or expenses in this period.</p>}
            </>}
        </article>
    )
}
