import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { useTranslation } from 'react-i18next'

type BudgetRingProps = {
  percentage: number
}

export function BudgetRing({ percentage }: BudgetRingProps) {
  const { t } = useTranslation()
  const normalizedPercentage = Math.min(100, Math.max(0, percentage))
  const data = [
    { name: t('dashboard.budgetRing.usedName'), value: normalizedPercentage },
    { name: t('dashboard.budgetRing.remainingName'), value: 100 - normalizedPercentage },
  ]

  return (
    <div
      className="budget-ring"
      role="img"
      aria-label={t('dashboard.budgetRing.label', {value: normalizedPercentage})}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart accessibilityLayer>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="72%"
            outerRadius="93%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            <Cell fill="#b99153" />
            <Cell fill="#eee8dd" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <span className="budget-ring-value">
        <strong>{normalizedPercentage}%</strong>
        <small>{t('dashboard.budgetRing.used')}</small>
      </span>
    </div>
  )
}
