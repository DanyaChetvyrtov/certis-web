import {Cell, Pie, PieChart, ResponsiveContainer} from 'recharts'
import {useTranslation} from 'react-i18next'

export function BudgetRing({percentage}: {percentage: number}) {
    const {t, i18n} = useTranslation()
    const actualPercentage = Number.isFinite(percentage) ? Math.max(0, percentage) : 0
    const arcPercentage = Math.min(100, actualPercentage)
    const shownPercentage = new Intl.NumberFormat(i18n.language, {maximumFractionDigits: 1}).format(actualPercentage)
    const data = [
        {name: t('dashboard.budgetRing.usedName'), value: arcPercentage},
        {name: t('dashboard.budgetRing.remainingName'), value: 100 - arcPercentage},
    ]

    return <div className="budget-ring" role="img" aria-label={t('dashboard.budgetRing.label', {value: shownPercentage})}>
        <ResponsiveContainer width="100%" height="100%">
            <PieChart accessibilityLayer>
                <Pie data={data} dataKey="value" innerRadius="72%" outerRadius="93%"
                    startAngle={90} endAngle={-270} stroke="none">
                    <Cell fill="#10b981"/>
                    <Cell fill="#294866"/>
                </Pie>
            </PieChart>
        </ResponsiveContainer>
        <span className="budget-ring-value"><strong>{shownPercentage}%</strong><small>{t('dashboard.budgetRing.used')}</small></span>
    </div>
}
