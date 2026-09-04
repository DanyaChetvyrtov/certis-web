import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AccountCurrency } from '../../accounts/api/accountsApi'

export type CashFlowPoint = {
  bucketStart?: string
  label: string
  income: number
  expenses: number
}

type CashFlowChartProps = {
  description?: string
  currency: AccountCurrency
  data: CashFlowPoint[]
}

const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const formatMoney = (value: number, currency: AccountCurrency) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)

export function CashFlowChart({ currency, data, description = 'Income and expenses for the last six months' }: CashFlowChartProps) {
  return (
    <div
      className="cash-flow-chart"
      role="img"
      aria-label={description}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
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
            stroke="#e7e2d8"
            strokeDasharray="4 7"
            vertical={false}
          />
          <XAxis
            dataKey={data[0]?.bucketStart ? 'bucketStart' : 'label'}
            tickFormatter={(value: string) => data.find(point => point.bucketStart === value)?.label ?? value}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#8996aa', fontSize: 11 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#8996aa', fontSize: 11 }}
            tickFormatter={(value: number) => compactFormatter.format(value)}
            width={52}
          />
          <Tooltip
            labelFormatter={(value) => data.find(point => point.bucketStart === value)?.label ?? value}
            cursor={{ stroke: '#cad3dd', strokeDasharray: '4 4' }}
            contentStyle={{
              border: '1px solid #dde3e9',
              borderRadius: 12,
              boxShadow: '0 12px 30px rgb(14 31 53 / 12%)',
              color: '#10243c',
              fontSize: 12,
            }}
            formatter={(value, name) => [
              formatMoney(Number(value), currency),
              name === 'income' ? 'Income' : 'Expenses',
            ]}
          />
          <Area
            type="monotone"
            dataKey="income"
            stroke="#10b981"
            strokeWidth={3}
            fill="url(#income-gradient)"
            activeDot={{ r: 5, fill: '#fff', strokeWidth: 3 }}
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stroke="#ef6a62"
            strokeWidth={2.4}
            fill="url(#expenses-gradient)"
            activeDot={{ r: 4, fill: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
