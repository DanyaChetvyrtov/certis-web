import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

type BudgetRingProps = {
  percentage: number
}

export function BudgetRing({ percentage }: BudgetRingProps) {
  const normalizedPercentage = Math.min(100, Math.max(0, percentage))
  const data = [
    { name: 'Used', value: normalizedPercentage },
    { name: 'Remaining', value: 100 - normalizedPercentage },
  ]

  return (
    <div
      className="budget-ring"
      role="img"
      aria-label={`${normalizedPercentage}% of the monthly budget used`}
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
        <small>used</small>
      </span>
    </div>
  )
}
