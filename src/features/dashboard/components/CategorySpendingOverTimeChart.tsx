import {
    Bar,
    BarChart,
    CartesianGrid,
    ReferenceDot,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import {useLanguage} from '../../../i18n/useLanguage'
import type {Currency} from '../../../shared/currency'
import type {
    CategorySpendingOverTime,
} from '../../categories/api/categoriesApi'

const OTHER_COLOR = '#7f9ab5'

const parseMonth = (value: string): Date => {
    const [year, month] = value.split('-').map(Number)

    return new Date(Date.UTC(year, month - 1, 1))
}

const formatMoney = (
    value: number,
    currency: Currency,
    locale: string,
) => new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
}).format(value)

type ChartRow = Record<string, string | number> & {
    bucketMonth: string
    label: string
    total: number
}

export function CategorySpendingOverTimeChart({
    analytics,
    currency,
    description,
}: {
    analytics: CategorySpendingOverTime
    currency: Currency
    description: string
}) {
    const {locale} = useLanguage()
    const monthFormatter = new Intl.DateTimeFormat(locale, {
        month: 'short',
    })
    const compactFormatter = new Intl.NumberFormat(locale, {
        notation: 'compact',
        maximumFractionDigits: 1,
    })
    const months = Array.from(new Set(
        analytics.series.flatMap((series) =>
            series.points.map((point) => point.bucketMonth),
        ),
    )).sort()
    const chartData: ChartRow[] = months.map((bucketMonth) => {
        const row: ChartRow = {
            bucketMonth,
            label: monthFormatter.format(parseMonth(bucketMonth)),
            total: 0,
        }

        analytics.series.forEach((series, index) => {
            const amount = Number(series.points.find(
                (point) => point.bucketMonth === bucketMonth,
            )?.amount ?? 0)
            row[`series-${index}`] = amount
            row.total += amount
        })

        return row
    })
    const lastPoint = chartData.at(-1)

    return (
        <div
            className="category-over-time-chart"
            role="img"
            aria-label={description}
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{top: 14, right: 58, bottom: 0, left: -16}}
                    barCategoryGap="22%"
                    accessibilityLayer
                >
                    <CartesianGrid
                        stroke="var(--chart-grid)"
                        strokeDasharray="4 7"
                        vertical={false}
                    />
                    <XAxis
                        dataKey="bucketMonth"
                        tickFormatter={(value: string) => String(
                            chartData.find(
                                (point) => point.bucketMonth === value,
                            )?.label ?? value,
                        )}
                        axisLine={false}
                        tickLine={false}
                        tick={{fill: 'var(--chart-axis-text)', fontSize: 11}}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{fill: 'var(--chart-axis-text)', fontSize: 11}}
                        tickFormatter={(value: number) => compactFormatter.format(value)}
                        width={52}
                    />
                    <Tooltip
                        labelFormatter={(value) => String(
                            chartData.find(
                                (point) => point.bucketMonth === value,
                            )?.label ?? value,
                        )}
                        cursor={{fill: 'var(--chart-tooltip-cursor)'}}
                        contentStyle={{
                            border: '1px solid var(--chart-tooltip-border)',
                            borderRadius: 12,
                            background: 'var(--chart-tooltip-background)',
                            boxShadow: '0 12px 30px rgb(14 31 53 / 12%)',
                            color: 'var(--chart-tooltip-text)',
                            fontSize: 12,
                        }}
                        formatter={(value, name) => [
                            formatMoney(Number(value), currency, locale),
                            name,
                        ]}
                    />
                    {analytics.series.map((series, index) => (
                        <Bar
                            key={series.categoryId ?? 'other'}
                            dataKey={`series-${index}`}
                            name={series.categoryName}
                            stackId="spending"
                            fill={series.categoryColor || OTHER_COLOR}
                            maxBarSize={64}
                            radius={index === analytics.series.length - 1
                                ? [4, 4, 0, 0]
                                : 0}
                            isAnimationActive={false}
                        />
                    ))}
                    {lastPoint && lastPoint.total > 0 && (
                        <ReferenceDot
                            x={lastPoint.bucketMonth}
                            y={lastPoint.total}
                            r={0}
                            label={{
                                value: compactFormatter.format(lastPoint.total),
                                position: 'right',
                                fill: 'var(--chart-axis-text)',
                                fontSize: 11,
                                fontWeight: 700,
                            }}
                        />
                    )}
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
