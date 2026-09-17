import {useMemo, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import {LoadingIndicator} from '../../../components/LoadingIndicator'
import {useModalAccessibility} from '../../../shared/hooks/useModalAccessibility'
import type {Currency} from '../../../shared/currency'
import type {BudgetCategoryConstraint, BudgetForecastItem} from '../api/budgetPlanningApi'

type Props = {
    category: BudgetCategoryConstraint
    currency: Currency
    initialSelectedSourceKeys: string[]
    items: BudgetForecastItem[]
    locale: string
    month: string
    status: 'loading' | 'ready' | 'error'
    onApply: ((amount: number, sourceKeys: string[]) => void) | null
    onClose: () => void
    onRetry: () => void
}

const formatMoney = (value: number, currency: string, locale: string) =>
    new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        maximumFractionDigits: 2,
    }).format(value)

const formatDate = (value: string | null, locale: string) => value
    ? new Intl.DateTimeFormat(locale, {day: 'numeric', month: 'short'}).format(new Date(`${value}T00:00:00`))
    : '—'

const formatMonth = (value: string, locale: string) =>
    new Intl.DateTimeFormat(locale, {month: 'long', year: 'numeric'}).format(new Date(`${value}-01T00:00:00`))

export function RecurringConstraintModal({
    category,
    currency,
    initialSelectedSourceKeys,
    items,
    locale,
    month,
    status,
    onApply,
    onClose,
    onRetry,
}: Props) {
    const {t} = useTranslation()
    const dialogRef = useModalAccessibility<HTMLElement>({onClose})
    const [selectedSourceKeys, setSelectedSourceKeys] = useState(() => new Set(initialSelectedSourceKeys))
    const selectedAmount = useMemo(() => items.reduce((sum, item) =>
        item.included && selectedSourceKeys.has(item.sourceKey) ? sum + item.effectiveAmount : sum, 0), [items, selectedSourceKeys])

    const toggle = (sourceKey: string) => setSelectedSourceKeys((current) => {
        const next = new Set(current)
        if (next.has(sourceKey)) next.delete(sourceKey)
        else next.add(sourceKey)
        return next
    })

    const apply = () => {
        if (!onApply) return
        onApply(selectedAmount, items.filter((item) => item.included && selectedSourceKeys.has(item.sourceKey)).map((item) => item.sourceKey))
    }

    return <div className="forecast-modal-backdrop" role="presentation" onMouseDown={onClose}>
        <section ref={dialogRef} className="forecast-modal recurring-constraint-modal" role="dialog" aria-modal="true" aria-labelledby="recurring-constraint-title" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>
            <header>
                <div><span>{t('budgets.constraints.recurringModal.eyebrow')}</span><h2 id="recurring-constraint-title">{t('budgets.constraints.recurringModal.title', {category: category.category.name})}</h2></div>
                <button type="button" aria-label={t('budgets.constraints.recurringModal.close')} onClick={onClose}><Icon name="close"/></button>
            </header>
            <p className="recurring-constraint-description">{t('budgets.constraints.recurringModal.description', {month: formatMonth(month, locale)})}</p>
            <div className="recurring-constraint-summary">
                <div><span>{t('budgets.constraints.recurringModal.currentMinimum')}</span><strong>{formatMoney(category.requiredAmount || category.fundingLevels.find((level) => level.level === 'MINIMUM')?.amount || 0, currency, locale)}</strong></div>
                <div><span>{t('budgets.constraints.recurringModal.selectedTotal')}</span><strong>{formatMoney(selectedAmount, currency, locale)}</strong></div>
            </div>
            {status === 'loading' && <div className="recurring-constraint-state"><LoadingIndicator label={t('budgets.constraints.recurringModal.loading')} layout="panel" showLabel size="small"/></div>}
            {status === 'error' && <div className="recurring-constraint-state error" role="alert"><p>{t('budgets.constraints.recurringModal.loadError')}</p><button type="button" onClick={onRetry}>{t('budgets.tryAgain')}</button></div>}
            {status === 'ready' && items.length === 0 && <div className="recurring-constraint-empty"><Icon name="repeat"/><strong>{t('budgets.constraints.recurringModal.empty')}</strong><p>{t('budgets.constraints.recurringModal.emptyDescription')}</p></div>}
            {status === 'ready' && items.length > 0 && <div className="recurring-constraint-list">
                {items.map((item) => {
                    const date = formatDate(item.expectedDate, locale)
                    return <label key={item.sourceKey} className={!item.included ? 'excluded' : ''}>
                        <input type="checkbox" checked={item.included && selectedSourceKeys.has(item.sourceKey)} disabled={!item.included || !onApply} aria-label={t('budgets.constraints.recurringModal.togglePayment', {title: item.title, date})} onChange={() => toggle(item.sourceKey)}/>
                        <span className="recurring-constraint-check"><Icon name="check-circle"/></span>
                        <span className="recurring-constraint-payment"><strong>{item.title}</strong><small><Icon name="calendar"/>{date}<i>·</i><Icon name="repeat"/>{t(`transactions.recurringView.frequency.${item.recurring?.frequency ?? 'MONTHLY'}`)}</small></span>
                        <span className="recurring-constraint-amount"><strong>{formatMoney(item.effectiveAmount, currency, locale)}</strong>{!item.included && <small>{t('budgets.constraints.recurringModal.excluded')}</small>}</span>
                    </label>
                })}
            </div>}
            <p className="recurring-constraint-note"><Icon name="shield"/>{onApply ? t('budgets.constraints.recurringModal.amountOnlyNote') : t('budgets.constraints.recurringModal.fixedNote')}</p>
            <footer>
                <button type="button" className="secondary" onClick={onClose}>{t('budgets.constraints.recurringModal.cancel')}</button>
                {onApply && <button type="button" className="primary" disabled={status !== 'ready'} onClick={apply}>{t('budgets.constraints.recurringModal.apply')}</button>}
            </footer>
        </section>
    </div>
}
