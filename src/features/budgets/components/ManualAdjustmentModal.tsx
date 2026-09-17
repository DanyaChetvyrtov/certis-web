import {useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import {getCategoryOptions} from '../../categories/api/categoriesApi'
import type {CategoryOption} from '../../categories/api/categoriesApi'
import type {BudgetForecastManualAdjustmentRequest, BudgetForecastOperationType} from '../api/budgetPlanningApi'

type ManualAdjustmentModalProps = {
    onClose: () => void
    onAdd: (adjustment: BudgetForecastManualAdjustmentRequest, category: CategoryOption | null) => void
}

export function ManualAdjustmentModal({onClose, onAdd}: ManualAdjustmentModalProps) {
    const {t} = useTranslation()
    const [operationType, setOperationType] = useState<BudgetForecastOperationType>('EXPENSE')
    const [title, setTitle] = useState('')
    const [amount, setAmount] = useState('')
    const [expectedDate, setExpectedDate] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [categories, setCategories] = useState<CategoryOption[]>([])
    const [categoryStatus, setCategoryStatus] = useState<'loading' | 'ready' | 'error'>('loading')
    const [reloadToken, setReloadToken] = useState(0)
    const [formError, setFormError] = useState('')

    useEffect(() => {
        const controller = new AbortController()
        getCategoryOptions(operationType, controller.signal).then((options) => {
            if (controller.signal.aborted) return
            setCategories(options)
            setCategoryStatus('ready')
        }).catch((caught: unknown) => {
            if (controller.signal.aborted || (caught instanceof Error && caught.name === 'AbortError')) return
            setCategoryStatus('error')
        })
        return () => controller.abort()
    }, [operationType, reloadToken])

    const setType = (type: BudgetForecastOperationType) => {
        setCategoryId('')
        setCategories([])
        setCategoryStatus('loading')
        setOperationType(type)
        setFormError('')
    }

    const reloadCategories = () => {
        setCategories([])
        setCategoryStatus('loading')
        setReloadToken((value) => value + 1)
    }

    const submit = () => {
        const parsedAmount = Number(amount)
        if (!title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            setFormError(t('budgets.planning.manual.invalidFields'))
            return
        }
        const category = categories.find((option) => option.id === categoryId) ?? null
        if (operationType === 'EXPENSE' && !category) {
            setFormError(t('budgets.planning.manual.categoryRequired'))
            return
        }
        onAdd({
            clientId: crypto.randomUUID(),
            operationType,
            title: title.trim(),
            categoryId: category?.id ?? null,
            expectedDate: expectedDate || null,
            amount: parsedAmount,
        }, category)
    }

    return <div className="forecast-modal-backdrop" role="presentation" onMouseDown={onClose}>
        <section className="forecast-modal" role="dialog" aria-modal="true" aria-labelledby="manual-adjustment-title" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span>{t('budgets.planning.manual.eyebrow')}</span><h2 id="manual-adjustment-title">{t('budgets.planning.manual.title')}</h2></div><button type="button" aria-label={t('budgets.planning.manual.close')} onClick={onClose}><Icon name="close"/></button></header>
            <div className="forecast-manual-type" role="group">{(['EXPENSE', 'INCOME'] as const).map((type) => <button key={type} type="button" className={operationType === type ? 'active' : ''} onClick={() => setType(type)}>{type === 'EXPENSE' ? t('budgets.planning.expenses') : t('budgets.planning.income')}</button>)}</div>
            <label>{t('budgets.planning.manual.name')}<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('budgets.planning.manual.namePlaceholder')}/></label>
            <label>{t('budgets.planning.manual.category')}
                <select value={categoryId} disabled={categoryStatus === 'loading'} onChange={(event) => {setCategoryId(event.target.value); setFormError('')}}>
                    <option value="">{categoryStatus === 'loading' ? t('budgets.planning.manual.categoryLoading') : operationType === 'EXPENSE' ? t('budgets.planning.manual.categoryPlaceholder') : t('budgets.planning.manual.categoryOptional')}</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
            </label>
            {categoryStatus === 'error' && <div className="forecast-manual-error" role="alert">{t('budgets.planning.manual.categoryLoadError')} <button type="button" onClick={reloadCategories}>{t('budgets.tryAgain')}</button></div>}
            {categoryStatus === 'ready' && categories.length === 0 && <p className="forecast-manual-hint">{t('budgets.planning.manual.categoryEmpty')}</p>}
            <label>{t('budgets.planning.manual.amount')}<input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)}/></label>
            <label>{t('budgets.planning.manual.date')}<input type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)}/></label>
            {formError && <div className="forecast-manual-error" role="alert">{formError}</div>}
            <footer><button type="button" className="secondary" onClick={onClose}>{t('budgets.planning.manual.cancel')}</button><button type="button" className="primary" onClick={submit}>{t('budgets.planning.manual.add')}</button></footer>
        </section>
    </div>
}
