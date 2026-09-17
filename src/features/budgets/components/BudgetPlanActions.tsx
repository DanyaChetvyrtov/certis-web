import {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import type {Currency} from '../../../shared/currency'
import {cancelBudgetPlan, createBudgetPlan, getBudgetPlanRevisions} from '../api/budgetPlanningApi'
import type {BudgetPlan, BudgetPlanRevision} from '../api/budgetPlanningApi'
import './BudgetPlanActions.css'

type BudgetPlanActionsProps = {
    plan: BudgetPlan
    month: string
    currency: Currency
    locale: string
    onPlanCreated: (plan: BudgetPlan) => Promise<void> | void
    onPlanCancelled: (plan: BudgetPlan) => void
}

const statusKey = (status: BudgetPlan['status']) => {
    if (status === 'APPLIED') return 'budgets.planning.lifecycle.statusApplied'
    if (status === 'SUPERSEDED') return 'budgets.planning.lifecycle.statusSuperseded'
    if (status === 'CANCELLED') return 'budgets.planning.lifecycle.statusCancelled'
    return 'budgets.planning.lifecycle.statusDraft'
}

export function BudgetPlanActions({plan, month, currency, locale, onPlanCreated, onPlanCancelled}: BudgetPlanActionsProps) {
    const {t} = useTranslation()
    const [historyOpen, setHistoryOpen] = useState(false)
    const [history, setHistory] = useState<BudgetPlanRevision[]>([])
    const [historyStatus, setHistoryStatus] = useState<'idle' | 'loading' | 'error'>('idle')
    const [confirmationOpen, setConfirmationOpen] = useState(false)
    const [busy, setBusy] = useState<'create' | 'cancel' | null>(null)
    const [actionError, setActionError] = useState('')

    const formatTimestamp = (timestamp: string) => new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(timestamp))

    const loadHistory = async () => {
        setHistoryStatus('loading')
        try {
            const result = await getBudgetPlanRevisions(month, currency)
            setHistory(result.items)
            setHistoryStatus('idle')
        } catch {
            setHistoryStatus('error')
        }
    }

    const openHistory = () => {
        setHistoryOpen(true)
        void loadHistory()
    }

    const createRevision = async () => {
        if (busy) return
        setBusy('create')
        setActionError('')
        try {
            const created = await createBudgetPlan(month, currency, crypto.randomUUID())
            await onPlanCreated(created)
        } catch (caught) {
            setActionError(caught instanceof Error ? caught.message : t('budgets.planning.createError'))
        } finally {
            setBusy(null)
        }
    }

    const cancelDraft = async () => {
        if (busy) return
        setBusy('cancel')
        setActionError('')
        try {
            const cancelled = await cancelBudgetPlan(plan.id, plan.version)
            onPlanCancelled(cancelled)
            setConfirmationOpen(false)
        } catch (caught) {
            setActionError(caught instanceof Error ? caught.message : t('budgets.planning.lifecycle.cancelError'))
        } finally {
            setBusy(null)
        }
    }

    return <>
        <div className="budget-plan-toolbar">
            <div className="budget-plan-current">
                <strong>{t('budgets.planning.lifecycle.revision', {revision: plan.revision})}</strong>
                <span className={plan.status.toLowerCase()}>{t(statusKey(plan.status))}</span>
            </div>
            <div className="budget-plan-buttons">
                <button type="button" onClick={openHistory}><Icon name="list"/>{t('budgets.planning.lifecycle.history')}</button>
                {plan.status !== 'DRAFT' && <button type="button" className="primary" disabled={busy != null} onClick={() => void createRevision()}><Icon name="plus"/>{busy === 'create' ? t('budgets.planning.lifecycle.creating') : t('budgets.planning.lifecycle.newRevision')}</button>}
                {plan.capabilities.canCancel && <button type="button" className="danger" disabled={busy != null} onClick={() => setConfirmationOpen(true)}>{t('budgets.planning.lifecycle.cancelDraft')}</button>}
            </div>
        </div>
        {actionError && <div className="budget-action-error" role="alert">{actionError}</div>}
        {historyOpen && <div className="forecast-modal-backdrop" role="presentation" onMouseDown={() => setHistoryOpen(false)}>
            <section className="forecast-modal budget-history-modal" role="dialog" aria-modal="true" aria-labelledby="budget-history-title" onMouseDown={(event) => event.stopPropagation()}>
                <header><div><span>{t('budgets.planning.lifecycle.historyEyebrow')}</span><h2 id="budget-history-title">{t('budgets.planning.lifecycle.historyTitle')}</h2></div><button type="button" aria-label={t('budgets.planning.lifecycle.closeHistory')} onClick={() => setHistoryOpen(false)}><Icon name="close"/></button></header>
                <p>{t('budgets.planning.lifecycle.historyDescription', {month, currency})}</p>
                {historyStatus === 'loading' && <div className="budget-history-state">{t('budgets.planning.lifecycle.historyLoading')}</div>}
                {historyStatus === 'error' && <div className="budget-history-state error" role="alert">{t('budgets.planning.lifecycle.historyLoadError')}<button type="button" onClick={() => void loadHistory()}>{t('budgets.tryAgain')}</button></div>}
                {historyStatus === 'idle' && history.length === 0 && <div className="budget-history-state">{t('budgets.planning.lifecycle.historyEmpty')}</div>}
                {historyStatus === 'idle' && history.length > 0 && <ol className="budget-history-list">{history.map((revision) => <li key={revision.id} className={revision.id === plan.id ? 'current' : ''}>
                    <div><strong>{t('budgets.planning.lifecycle.revision', {revision: revision.revision})}</strong>{revision.id === plan.id && <small>{t('budgets.planning.lifecycle.current')}</small>}</div>
                    <span className={revision.status.toLowerCase()}>{t(statusKey(revision.status))}</span>
                    <time>{t('budgets.planning.lifecycle.createdAt', {date: formatTimestamp(revision.createdAt)})}</time>
                    {revision.appliedAt && <time>{t('budgets.planning.lifecycle.appliedAt', {date: formatTimestamp(revision.appliedAt)})}</time>}
                </li>)}</ol>}
            </section>
        </div>}
        {confirmationOpen && <div className="forecast-modal-backdrop" role="presentation" onMouseDown={() => {if (!busy) setConfirmationOpen(false)}}>
            <section className="forecast-modal budget-cancel-modal" role="dialog" aria-modal="true" aria-labelledby="budget-cancel-title" onMouseDown={(event) => event.stopPropagation()}>
                <header><div><span>{t('budgets.planning.lifecycle.cancelEyebrow')}</span><h2 id="budget-cancel-title">{t('budgets.planning.lifecycle.cancelTitle')}</h2></div></header>
                <p>{t('budgets.planning.lifecycle.cancelDescription', {revision: plan.revision})}</p>
                <footer><button type="button" className="secondary" disabled={busy != null} onClick={() => setConfirmationOpen(false)}>{t('budgets.planning.manual.cancel')}</button><button type="button" className="danger" disabled={busy != null} onClick={() => void cancelDraft()}>{busy === 'cancel' ? t('budgets.planning.lifecycle.cancelling') : t('budgets.planning.lifecycle.confirmCancel')}</button></footer>
            </section>
        </div>}
    </>
}
