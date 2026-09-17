import {useEffect, useMemo, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import {Select, SelectOption} from '../../../components/Select'
import {LoadingIndicator} from '../../../components/LoadingIndicator'
import type {Currency} from '../../../shared/currency'
import {useModalAccessibility} from '../../../shared/hooks/useModalAccessibility'
import {getCategoryOptions} from '../../categories/api/categoriesApi'
import type {CategoryOption} from '../../categories/api/categoriesApi'
import type {BudgetCategoryConstraint, BudgetConstraintRole, BudgetPriority} from '../api/budgetPlanningApi'

type Props = {
    currency: Currency
    existingCategoryIds: string[]
    locale: string
    onAdd: (category: BudgetCategoryConstraint) => void
    onClose: () => void
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 10_000) / 10_000
const formatMoney = (value: number, currency: string, locale: string) => new Intl.NumberFormat(locale, {style: 'currency', currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0}).format(value)

export function AddConstraintModal({currency, existingCategoryIds, locale, onAdd, onClose}: Props) {
    const {t} = useTranslation()
    const dialogRef = useModalAccessibility<HTMLElement>({onClose})
    const [options, setOptions] = useState<CategoryOption[]>([])
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
    const [reloadToken, setReloadToken] = useState(0)
    const [categoryId, setCategoryId] = useState('')
    const [constraintRole, setConstraintRole] = useState<BudgetConstraintRole>('FLEXIBLE')
    const [priority, setPriority] = useState<BudgetPriority>('MEDIUM')
    const [minimumAmount, setMinimumAmount] = useState('')
    const [comfortableAmount, setComfortableAmount] = useState('')
    const [formError, setFormError] = useState('')
    const existingIds = useMemo(() => new Set(existingCategoryIds), [existingCategoryIds])
    const availableOptions = useMemo(() => options.filter((option) => !existingIds.has(option.id)), [existingIds, options])

    useEffect(() => {
        const controller = new AbortController()
        getCategoryOptions('EXPENSE', controller.signal).then((loaded) => {
            if (controller.signal.aborted) return
            setOptions(loaded)
            setStatus('ready')
        }).catch((caught: unknown) => {
            if (controller.signal.aborted || (caught instanceof Error && caught.name === 'AbortError')) return
            setStatus('error')
        })
        return () => controller.abort()
    }, [reloadToken])

    const minimum = Math.max(0, Number(minimumAmount) || 0)
    const comfortable = Math.max(0, Number(comfortableAmount) || 0)
    const balanced = roundMoney(minimum + (comfortable - minimum) * 0.625)

    const retry = () => {
        setOptions([])
        setStatus('loading')
        setReloadToken((value) => value + 1)
    }

    const submit = () => {
        const category = availableOptions.find((option) => option.id === categoryId)
        if (!category || !Number.isFinite(comfortable) || comfortable <= 0 || !Number.isFinite(minimum) || minimum < 0 || comfortable < minimum) {
            setFormError(t('budgets.constraints.addModal.invalidFields'))
            return
        }
        onAdd({
            category,
            allocationType: 'VARIABLE',
            constraintRole,
            requiredAmount: constraintRole === 'REQUIRED' ? minimum : 0,
            priority,
            fundingLevels: [
                {level: 'MINIMUM', amount: minimum, coverage: minimum / comfortable},
                {level: 'BALANCED', amount: balanced, coverage: balanced / comfortable},
                {level: 'COMFORTABLE', amount: comfortable, coverage: 1},
            ],
            sourceKeys: [],
        })
    }

    return <div className="forecast-modal-backdrop" role="presentation" onMouseDown={onClose}>
        <section ref={dialogRef} className="forecast-modal add-constraint-modal" role="dialog" aria-modal="true" aria-labelledby="add-constraint-title" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>
            <header>
                <div><span>{t('budgets.constraints.addModal.eyebrow')}</span><h2 id="add-constraint-title">{t('budgets.constraints.addModal.title')}</h2></div>
                <button type="button" aria-label={t('budgets.constraints.addModal.close')} onClick={onClose}><Icon name="close"/></button>
            </header>
            <p className="add-constraint-description">{t('budgets.constraints.addModal.description')}</p>
            {status === 'loading' && <div className="add-constraint-state"><LoadingIndicator label={t('budgets.constraints.addModal.loading')} layout="panel" showLabel size="small"/></div>}
            {status === 'error' && <div className="forecast-manual-error" role="alert">{t('budgets.constraints.addModal.loadError')} <button type="button" onClick={retry}>{t('budgets.tryAgain')}</button></div>}
            {status === 'ready' && <>
                <label>{t('budgets.constraints.addModal.category')}
                    <Select aria-label={t('budgets.constraints.addModal.category')} value={categoryId} onValueChange={(value) => {setCategoryId(value); setFormError('')}}>
                        <SelectOption value="">{t('budgets.constraints.addModal.categoryPlaceholder')}</SelectOption>
                        {availableOptions.map((category) => <SelectOption key={category.id} value={category.id}>{category.name}</SelectOption>)}
                    </Select>
                </label>
                {availableOptions.length === 0 && <p className="forecast-manual-hint">{t('budgets.constraints.addModal.empty')}</p>}
                <div className="add-constraint-grid">
                    <label>{t('budgets.constraints.classification')}
                        <Select aria-label={t('budgets.constraints.classification')} value={constraintRole} onValueChange={(value) => {setConstraintRole(value as BudgetConstraintRole); if (value === 'REQUIRED') setPriority('HIGH')}}>
                            <SelectOption value="FLEXIBLE">{t('budgets.constraints.classificationFlexible')}</SelectOption>
                            <SelectOption value="REQUIRED">{t('budgets.constraints.classificationRequired')}</SelectOption>
                        </Select>
                    </label>
                    <label>{t('budgets.constraints.priority')}
                        <Select aria-label={t('budgets.constraints.priority')} value={priority} onValueChange={(value) => setPriority(value as BudgetPriority)}>
                            <SelectOption value="HIGH">{t('budgets.constraints.high')}</SelectOption>
                            <SelectOption value="MEDIUM">{t('budgets.constraints.medium')}</SelectOption>
                            <SelectOption value="LOW">{t('budgets.constraints.low')}</SelectOption>
                        </Select>
                    </label>
                    <label>{t('budgets.constraints.addModal.minimumAmount')}<input type="number" min="0" step="100" value={minimumAmount} onChange={(event) => {setMinimumAmount(event.target.value); setFormError('')}}/></label>
                    <label>{t('budgets.constraints.addModal.comfortableAmount')}<input type="number" min="0" step="100" value={comfortableAmount} onChange={(event) => {setComfortableAmount(event.target.value); setFormError('')}}/></label>
                </div>
                <div className="add-constraint-levels">
                    <span>{t('budgets.constraints.levelMinimum')}<strong>{formatMoney(minimum, currency, locale)}</strong></span>
                    <span>{t('budgets.constraints.levelBalanced')}<strong>{comfortable >= minimum ? formatMoney(balanced, currency, locale) : '—'}</strong></span>
                    <span>{t('budgets.constraints.levelComfortable')}<strong>{formatMoney(comfortable, currency, locale)}</strong></span>
                </div>
            </>}
            {formError && <div className="forecast-manual-error" role="alert">{formError}</div>}
            <footer>
                <button type="button" className="secondary" onClick={onClose}>{t('budgets.constraints.addModal.cancel')}</button>
                <button type="button" className="primary" disabled={status !== 'ready' || availableOptions.length === 0} onClick={submit}>{t('budgets.constraints.addModal.add')}</button>
            </footer>
        </section>
    </div>
}
