import {Select, SelectOption} from '../../../components/Select'
import {useEffect, useMemo, useRef, useState} from 'react'
import type {CSSProperties} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import type {IconName} from '../../../components/Icons'
import {ApiError} from '../../../shared/api/ApiError'
import type {Account, Currency} from '../../accounts/api/accountsApi'
import type {Category} from '../../categories/api/categoriesApi'
import {isCategoryIcon} from '../../categories/api/categoriesApi'
import {
    cancelRecurringTransaction,
    getRecurringTransactions,
    updateRecurringTransaction,
} from '../api/recurringTransactionsApi'
import type {
    RecurringFrequency,
    RecurringStatus,
    RecurringTransaction,
    UpdateRecurringTransactionRequest,
} from '../api/recurringTransactionsApi'
import {RecurringTransactionFormModal} from './RecurringTransactionFormModal'
import './RecurringTransactionsView.css'
import {useLanguage} from '../../../i18n/useLanguage'
import type {TFunction} from 'i18next'

type Props = {
    accounts: Account[]
    categories: Category[]
    onHistory: () => void
}

type LoadState = 'loading' | 'ready' | 'error'
type StatusFilter = 'ALL' | RecurringStatus
type FormState = {transaction?: RecurringTransaction; restoreFocus: () => void}
type Notice = {kind: 'success' | 'error'; message: string}
type Occurrence = {date: string; template: RecurringTransaction}

const currencySymbols: Record<Currency, string> = {RUB: '₽', EUR: '€', USD: '$'}

const parseDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
}

const dateValue = (date: Date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
].join('-')

const addFrequency = (date: Date, frequency: RecurringFrequency, interval: number) => {
    const next = new Date(date)
    if (frequency === 'DAILY') next.setDate(next.getDate() + interval)
    if (frequency === 'WEEKLY') next.setDate(next.getDate() + interval * 7)
    if (frequency === 'MONTHLY') {
        const day = next.getDate()
        next.setDate(1)
        next.setMonth(next.getMonth() + interval)
        next.setDate(Math.min(day, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()))
    }
    if (frequency === 'YEARLY') {
        const month = next.getMonth()
        next.setFullYear(next.getFullYear() + interval)
        if (next.getMonth() !== month) next.setDate(0)
    }
    return next
}

const occurrencesBetween = (
    template: RecurringTransaction,
    start: Date,
    end: Date,
): Occurrence[] => {
    if (template.status !== 'ACTIVE' || !template.nextRunDate) return []
    const limit = template.endDate ? parseDate(template.endDate) : undefined
    let current = parseDate(template.nextRunDate)
    const result: Occurrence[] = []
    let guard = 0

    while (current <= end && (!limit || current <= limit) && guard < 400) {
        if (current >= start) result.push({date: dateValue(current), template})
        current = addFrequency(current, template.frequency, template.intervalCount)
        guard += 1
    }
    return result
}

const money = (amount: number, currency: Currency, locale: string, positive = false) => {
    const formatted = new Intl.NumberFormat(locale, {maximumFractionDigits: 2}).format(Math.abs(amount))
    return `${amount < 0 ? '−' : positive ? '+' : ''}${currencySymbols[currency]}${formatted}`
}

const moneyMap = (values: Map<Currency, number>, locale: string, positive = false) =>
    values.size
        ? Array.from(values).map(([currency, value]) => money(value, currency, locale, positive)).join(' · ')
        : '—'

const repeatLabel = (template: RecurringTransaction, t: TFunction) => {
    const unit = t(`transactions.recurringView.frequency.${template.frequency}`)
    return template.intervalCount === 1
        ? unit
        : t('transactions.recurringView.every', {
            count: template.intervalCount,
            unit: t(`transactions.recurringView.frequencyUnit.${template.frequency}`, {
                count: template.intervalCount,
            }),
        })
}

const requestFrom = (
    transaction: RecurringTransaction,
    status: 'ACTIVE' | 'PAUSED',
): UpdateRecurringTransactionRequest => ({
    accountId: transaction.accountId,
    categoryId: transaction.categoryId ?? null,
    name: transaction.name,
    type: transaction.type,
    amount: transaction.amount,
    merchant: transaction.merchant ?? null,
    note: transaction.note ?? null,
    status,
    frequency: transaction.frequency,
    intervalCount: transaction.intervalCount,
    startDate: transaction.startDate,
    endDate: transaction.endDate ?? null,
})

export function RecurringTransactionsView({accounts, categories, onHistory}: Props) {
    const {t} = useTranslation()
    const {locale} = useLanguage()
    const [templates, setTemplates] = useState<RecurringTransaction[]>([])
    const [loadState, setLoadState] = useState<LoadState>('loading')
    const [loadError, setLoadError] = useState('')
    const [reload, setReload] = useState(0)
    const [query, setQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
    const [formState, setFormState] = useState<FormState | null>(null)
    const [notice, setNotice] = useState<Notice | null>(null)
    const [busyId, setBusyId] = useState('')
    const [anchorDate] = useState(() => new Date())
    const newButtonRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        let active = true
        void getRecurringTransactions().then(
            (items) => {
                if (!active) return
                setTemplates(items)
                setLoadState('ready')
            },
            (error: unknown) => {
                if (!active) return
                setLoadError(error instanceof ApiError ? error.message : t('transactions.recurringView.loadError'))
                setLoadState('error')
            },
        )
        return () => { active = false }
    }, [reload, t])

    useEffect(() => {
        if (!notice) return
        const id = window.setTimeout(() => setNotice(null), 3400)
        return () => window.clearTimeout(id)
    }, [notice])

    const accountMap = useMemo(() => new Map(accounts.map((item) => [item.id, item])), [accounts])
    const categoryMap = useMemo(() => new Map(categories.map((item) => [item.id, item])), [categories])
    const monthStart = useMemo(() => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1), [anchorDate])
    const monthEnd = useMemo(() => new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0), [anchorDate])
    const upcomingEnd = useMemo(() => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate() + 30), [anchorDate])
    const monthOccurrences = useMemo(() => templates.flatMap((item) => occurrencesBetween(item, monthStart, monthEnd)), [monthEnd, monthStart, templates])
    const upcoming = useMemo(() => templates.flatMap((item) => occurrencesBetween(item, anchorDate, upcomingEnd)).sort((a, b) => a.date.localeCompare(b.date)), [anchorDate, templates, upcomingEnd])

    const metrics = useMemo(() => {
        const income = new Map<Currency, number>()
        const expenses = new Map<Currency, number>()
        monthOccurrences.forEach(({template}) => {
            const account = accountMap.get(template.accountId)
            if (!account) return
            const target = template.type === 'INCOME' ? income : expenses
            target.set(account.currency, (target.get(account.currency) ?? 0) + template.amount)
        })
        const net = new Map<Currency, number>()
        new Set([...income.keys(), ...expenses.keys()]).forEach((currency) => net.set(currency, (income.get(currency) ?? 0) - (expenses.get(currency) ?? 0)))
        return {income, expenses, net}
    }, [accountMap, monthOccurrences])

    const visible = useMemo(() => {
        const normalized = query.trim().toLowerCase()
        return templates.filter((item) => statusFilter === 'ALL' || item.status === statusFilter).filter((item) => {
            const account = accountMap.get(item.accountId)
            const category = item.categoryId ? categoryMap.get(item.categoryId) : undefined
            return !normalized || [item.name, item.merchant, item.note, account?.name, category?.name]
                .some((value) => value?.toLowerCase().includes(normalized))
        }).sort((a, b) => (a.nextRunDate ?? '9999').localeCompare(b.nextRunDate ?? '9999'))
    }, [accountMap, categoryMap, query, statusFilter, templates])

    const openForm = (transaction: RecurringTransaction | undefined, target: HTMLElement) => setFormState({transaction, restoreFocus: () => target.focus()})
    const saved = (transaction: RecurringTransaction, editing: boolean) => {
        setTemplates((current) => [transaction, ...current.filter((item) => item.id !== transaction.id)])
        setFormState(null)
        setNotice({kind: 'success', message: editing ? t('transactions.recurringView.updated') : t('transactions.recurringView.created')})
    }

    const changeStatus = async (transaction: RecurringTransaction, status: 'ACTIVE' | 'PAUSED') => {
        setBusyId(transaction.id)
        try {
            const updated = await updateRecurringTransaction(transaction.id, requestFrom(transaction, status))
            setTemplates((current) => current.map((item) => item.id === updated.id ? updated : item))
            setNotice({kind: 'success', message: status === 'PAUSED' ? t('transactions.recurringView.paused') : t('transactions.recurringView.resumed')})
        } catch (error) {
            setNotice({kind: 'error', message: error instanceof ApiError ? error.message : t('transactions.recurringView.updateError')})
        } finally { setBusyId('') }
    }

    const cancel = async (transaction: RecurringTransaction) => {
        if (!window.confirm(t('transactions.recurringView.cancelConfirm', {name: transaction.name}))) return
        setBusyId(transaction.id)
        try {
            await cancelRecurringTransaction(transaction.id)
            setTemplates((current) => current.map((item) => item.id === transaction.id ? {...item, status: 'CANCELLED', nextRunDate: null} : item))
            setNotice({kind: 'success', message: t('transactions.recurringView.cancelled')})
        } catch (error) {
            setNotice({kind: 'error', message: error instanceof ApiError ? error.message : t('transactions.recurringView.cancelError')})
        } finally { setBusyId('') }
    }

    const next = upcoming[0]
    const nextAccount = next ? accountMap.get(next.template.accountId) : undefined

    return <>
        <header className="transactions-page-header recurring-page-header">
            <div><h1>{t('transactions.title')}</h1><p>{t('transactions.subtitle')}</p></div>
            <div className="transactions-header-actions">
                <span className="transaction-period-button"><Icon name="calendar"/>{anchorDate.toLocaleDateString(locale, {month: 'short', year: 'numeric'})}</span>
                <button ref={newButtonRef} className="new-transaction-button" type="button" onClick={(event) => openForm(undefined, event.currentTarget)}><Icon name="plus"/>{t('transactions.recurringView.new')}</button>
            </div>
        </header>

        <div className="transaction-view-tabs" role="tablist" aria-label={t('transactions.view')}>
            <button type="button" role="tab" aria-selected="false" onClick={onHistory}>{t('transactions.history')}</button>
            <button className="active" type="button" role="tab" aria-selected="true"><Icon name="repeat"/>{t('transactions.recurring')}</button>
        </div>

        {notice && <div className={notice.kind === 'error' ? 'transactions-notice error' : 'transactions-notice'} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.message}</div>}

        <section className="transaction-metrics recurring-metrics" aria-label={t('transactions.recurringView.summary')}>
            <article><span className="metric-icon expense"><Icon name="repeat"/></span><div><p>{t('transactions.recurringView.scheduledExpenses')}</p><strong>{moneyMap(metrics.expenses, locale)}</strong><small className="expense">{t('transactions.recurringView.payments', {count: monthOccurrences.filter((item) => item.template.type === 'EXPENSE').length})}</small></div></article>
            <article><span className="metric-icon income"><Icon name="cash"/></span><div><p>{t('transactions.recurringView.scheduledIncome')}</p><strong>{moneyMap(metrics.income, locale)}</strong><small className="income">{t('transactions.recurringView.payments', {count: monthOccurrences.filter((item) => item.template.type === 'INCOME').length})}</small></div></article>
            <article><span className="metric-icon income"><Icon name="repeat"/></span><div><p>{t('transactions.recurringView.net')}</p><strong>{moneyMap(metrics.net, locale, true)}</strong><small className="income">{t('transactions.recurringView.planned')}</small></div></article>
            <article><span className="metric-icon average"><Icon name="calendar"/></span><div><p>{t('transactions.recurringView.nextPayment')}</p><strong>{next && nextAccount ? money(next.template.type === 'INCOME' ? next.template.amount : -next.template.amount, nextAccount.currency, locale, next.template.type === 'INCOME') : '—'}</strong><small className="average">{next ? `${next.template.name} · ${parseDate(next.date).toLocaleDateString(locale, {month: 'short', day: 'numeric'})}` : t('transactions.recurringView.noUpcoming')}</small></div></article>
        </section>

        <div className="recurring-content-grid">
            <section className="recurring-list-card">
                <header><div><h2>{t('transactions.recurringView.title')}</h2><p>{t('transactions.recurringView.subtitle')}</p></div><div className="recurring-list-tools"><label><Icon name="search"/><span className="sr-only">{t('transactions.recurringView.search')}</span><input type="search" placeholder={t('transactions.recurringView.search')} value={query} onChange={(event) => setQuery(event.target.value)}/></label><Select aria-label={t('transactions.recurringView.status')} value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}><SelectOption value="ALL">{t('transactions.recurringView.allStatuses')}</SelectOption>{(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'] as const).map((status) => <SelectOption value={status} key={status}>{t(`transactions.recurringView.statuses.${status}`)}</SelectOption>)}</Select></div></header>
                <div className="recurring-table-heading"><span>{t('transactions.recurringView.columns.rule')}</span><span>{t('transactions.recurringView.columns.repeats')}</span><span>{t('transactions.recurringView.columns.next')}</span><span>{t('transactions.recurringView.columns.amount')}</span><span>{t('transactions.recurringView.columns.status')}</span><span/></div>
                {loadState === 'loading' && <div className="transaction-loading-state" aria-label={t('transactions.recurringView.loading')}>{[1,2,3,4].map((item) => <span key={item}/>)}</div>}
                {loadState === 'error' && <div className="transaction-empty-state" role="alert"><span><Icon name="alert"/></span><h3>{t('transactions.recurringView.loadTitle')}</h3><p>{loadError}</p><button type="button" onClick={() => {setLoadState('loading'); setReload((value) => value + 1)}}>{t('transactions.tryAgain')}</button></div>}
                {loadState === 'ready' && visible.length === 0 && <div className="transaction-empty-state"><span><Icon name="repeat"/></span><h3>{templates.length ? t('transactions.recurringView.noFound') : t('transactions.recurringView.noItems')}</h3><p>{templates.length ? t('transactions.recurringView.filterDescription') : t('transactions.recurringView.emptyDescription')}</p>{!templates.length && <button type="button" onClick={(event) => openForm(undefined, event.currentTarget)}>{t('transactions.recurringView.create')}</button>}</div>}
                {loadState === 'ready' && visible.map((transaction) => {
                    const account = accountMap.get(transaction.accountId)
                    const category = transaction.categoryId ? categoryMap.get(transaction.categoryId) : undefined
                    const icon: IconName = category && isCategoryIcon(category.icon) ? category.icon : transaction.type === 'INCOME' ? 'cash' : 'repeat'
                    const color = category?.color ?? (transaction.type === 'INCOME' ? '#10b981' : '#df655e')
                    const active = transaction.status === 'ACTIVE' || transaction.status === 'PAUSED'
                    return <article className="recurring-row" style={{'--recurring-color': color} as CSSProperties} key={transaction.id}>
                        <div className="recurring-rule"><span><Icon name={icon}/></span><div><strong>{transaction.name}</strong><small>{category?.name ?? t('transactions.uncategorized')} · {account?.name ?? t('transactions.unknownAccount')}</small></div></div>
                        <div><strong>{repeatLabel(transaction, t)}</strong><small>{t('transactions.recurringView.repeatsAutomatically')}</small></div>
                        <div><strong>{transaction.nextRunDate ? parseDate(transaction.nextRunDate).toLocaleDateString(locale, {month: 'short', day: 'numeric'}) : '—'}</strong><small>{transaction.status === 'PAUSED' ? t('transactions.recurringView.statuses.PAUSED') : t('transactions.recurringView.nextRun')}</small></div>
                        <strong className={transaction.type === 'INCOME' ? 'recurring-income' : undefined}>{account ? money(transaction.type === 'INCOME' ? transaction.amount : -transaction.amount, account.currency, locale, transaction.type === 'INCOME') : transaction.amount}</strong>
                        <span className={`recurring-status ${transaction.status.toLowerCase()}`}>{t(`transactions.recurringView.statuses.${transaction.status}`)}</span>
                        <div className="recurring-row-actions"><button type="button" aria-label={t('transactions.recurringView.editLabel', {name: transaction.name})} disabled={!active || busyId === transaction.id} onClick={(event) => openForm(transaction, event.currentTarget)}><Icon name="edit"/></button>{active && <button type="button" aria-label={t(transaction.status === 'ACTIVE' ? 'transactions.recurringView.pauseLabel' : 'transactions.recurringView.resumeLabel', {name: transaction.name})} disabled={busyId === transaction.id} onClick={() => void changeStatus(transaction, transaction.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')}><Icon name={transaction.status === 'ACTIVE' ? 'close' : 'repeat'}/></button>}{active && <button className="danger" type="button" aria-label={t('transactions.recurringView.cancelLabel', {name: transaction.name})} disabled={busyId === transaction.id} onClick={() => void cancel(transaction)}><Icon name="trash"/></button>}</div>
                    </article>
                })}
                <footer>{t('transactions.recurringView.rules', {count: visible.length})}</footer>
            </section>

            <aside className="recurring-side-column">
                <section className="upcoming-card"><header><div><h2>{t('transactions.recurringView.upcoming')}</h2><p>{t('transactions.recurringView.nextDays')}</p></div></header>{upcoming.length === 0 ? <p className="recurring-side-empty">{t('transactions.recurringView.noneDue')}</p> : upcoming.slice(0, 6).map((item) => {const account=accountMap.get(item.template.accountId);const category=item.template.categoryId?categoryMap.get(item.template.categoryId):undefined;const date=parseDate(item.date);return <article key={`${item.template.id}-${item.date}`}><time><strong>{String(date.getDate()).padStart(2,'0')}</strong><small>{date.toLocaleDateString(locale,{month:'short'}).toUpperCase()}</small></time><div><strong>{item.template.name}</strong><small>{account?.name ?? t('transactions.unknownAccount')} · {category?.name ?? t('transactions.uncategorized')}</small></div><strong className={item.template.type === 'INCOME' ? 'recurring-income' : undefined}>{account ? money(item.template.type === 'INCOME' ? item.template.amount : -item.template.amount, account.currency, locale, item.template.type === 'INCOME') : item.template.amount}</strong></article>})}</section>
                <section className="scheduled-flow-card"><header><div><h2>{t('transactions.recurringView.scheduledFlow')}</h2><p>{t('transactions.recurringView.thisMonth')}</p></div><strong>{moneyMap(metrics.net, locale,true)}</strong></header><div className="scheduled-flow-bar"><i/><i/></div><p><span><i/>{t('transactions.income')}</span><strong>{moneyMap(metrics.income, locale)}</strong></p><p><span><i/>{t('transactions.expenses')}</span><strong>{moneyMap(metrics.expenses, locale)}</strong></p></section>
                <section className="recurring-info-card"><Icon name="repeat"/><div><strong>{t('transactions.recurringView.howTitle')}</strong><p>{t('transactions.recurringView.howDescription')}</p></div></section>
            </aside>
        </div>

        {formState && <RecurringTransactionFormModal accounts={accounts} categories={categories} transaction={formState.transaction} onClose={() => setFormState(null)} onSaved={saved} restoreFocus={formState.restoreFocus}/>}
    </>
}
