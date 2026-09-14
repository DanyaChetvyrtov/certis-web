import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import type { AccountCurrency } from '../../accounts/api/accountsApi'
import { useLanguage } from '../../../i18n/useLanguage'

export type CashFlowPoint = {
  bucketStart?: string
  label: string
  income: number
  expenses: number
}

type CashFlowComparisonPoint = Pick<CashFlowPoint, 'income' | 'expenses'>

type CashFlowChartProps = {
  description?: string
  currency: AccountCurrency
  data: CashFlowPoint[]
  comparisonData?: CashFlowComparisonPoint[]
}

const formatMoney = (value: number, currency: AccountCurrency, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)

export function CashFlowChart({ currency, data, comparisonData, description }: CashFlowChartProps) {
  const { t } = useTranslation()
  const { locale } = useLanguage()
  const compactFormatter = new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  })
  const chartData = data.map((point, index) => ({
    ...point,
    previousIncome: comparisonData?.[index]?.income,
    previousExpenses: comparisonData?.[index]?.expenses,
  }))

  return (
    <div
      className="cash-flow-chart"
      role="img"
      aria-label={description ?? t('dashboard.cashFlow.chartDescription')}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 18, right: 12, bottom: 0, left: -18 }}
          accessibilityLayer
        >
          <defs>
            <linearGradient id="income-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.015} />
            </linearGradient>
            <linearGradient id="expenses-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef6a62" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#ef6a62" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--chart-grid)"
            strokeDasharray="4 7"
            vertical={false}
          />
          <XAxis
            dataKey={data[0]?.bucketStart ? 'bucketStart' : 'label'}
            tickFormatter={(value: string) => chartData.find(point => point.bucketStart === value)?.label ?? value}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--chart-axis-text)', fontSize: 11 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--chart-axis-text)', fontSize: 11 }}
            tickFormatter={(value: number) => compactFormatter.format(value)}
            width={52}
          />
          <Tooltip
            labelFormatter={(value) => chartData.find(point => point.bucketStart === value)?.label ?? value}
            cursor={{
              stroke: 'var(--chart-tooltip-cursor)',
              strokeDasharray: '4 4',
            }}
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
          <Area
            type="monotone"
            dataKey="income"
            name={t('dashboard.income')}
            stroke="#10b981"
            strokeWidth={3}
            fill="url(#income-gradient)"
            activeDot={{
              r: 5,
              fill: 'var(--chart-active-dot)',
              strokeWidth: 3,
            }}
          />
          <Area
            type="monotone"
            dataKey="expenses"
            name={t('dashboard.expenses')}
            stroke="#ef6a62"
            strokeWidth={2.4}
            fill="url(#expenses-gradient)"
            activeDot={{
              r: 4,
              fill: 'var(--chart-active-dot)',
              strokeWidth: 2,
            }}
          />
          {comparisonData && (
            <Line
              type="monotone"
              dataKey="previousIncome"
              name={t('dashboard.cashFlow.previousIncome')}
              stroke="#10b981"
              strokeWidth={1.8}
              strokeOpacity={0.62}
              strokeDasharray="7 6"
              dot={false}
              activeDot={{r: 3}}
            />
          )}
          {comparisonData && (
            <Line
              type="monotone"
              dataKey="previousExpenses"
              name={t('dashboard.cashFlow.previousExpenses')}
              stroke="#ef6a62"
              strokeWidth={1.8}
              strokeOpacity={0.62}
              strokeDasharray="7 6"
              dot={false}
              activeDot={{r: 3}}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
