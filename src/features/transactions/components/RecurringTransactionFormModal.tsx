import {Select, SelectOption} from '../../../components/Select'
import {useMemo, useRef, useState} from 'react'
import type {FormEvent} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import {ApiError} from '../../../shared/api/ApiError'
import {useModalAccessibility} from '../../../shared/hooks/useModalAccessibility'
import type {Account} from '../../accounts/api/accountsApi'
import type {Category} from '../../categories/api/categoriesApi'
import {
    createRecurringTransaction,
    updateRecurringTransaction,
} from '../api/recurringTransactionsApi'
import type {
    RecurringFrequency,
    RecurringTransaction,
    RecurringTransactionRequest,
} from '../api/recurringTransactionsApi'
import type {TransactionType} from '../api/transactionsApi'
import './RecurringTransactionFormModal.css'
import {useLanguage} from '../../../i18n/useLanguage'

type Props = {
    accounts: Account[]
    categories: Category[]
    transaction?: RecurringTransaction
    onClose: () => void
    onSaved: (transaction: RecurringTransaction, editing: boolean) => void
    restoreFocus?: () => void
}

type Errors = Partial<Record<
    'accountId' | 'amount' | 'categoryId' | 'endDate' | 'name' | 'startDate',
    string
>>

const localDate = (date = new Date()) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
].join('-')

const previewDate = (value: string, locale: string, fallback: string) => {
    if (!value) return fallback

    return new Date(`${value}T00:00:00`).toLocaleDateString(locale, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    })
}

export function RecurringTransactionFormModal({
    accounts,
    categories,
    transaction,
    onClose,
    onSaved,
    restoreFocus,
}: Props) {
    const {t} = useTranslation()
    const {locale} = useLanguage()
    const editing = Boolean(transaction)
    const [type, setType] = useState<TransactionType>(transaction?.type ?? 'EXPENSE')
    const [name, setName] = useState(transaction?.name ?? '')
    const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
    const [accountId, setAccountId] = useState(transaction?.accountId ?? '')
    const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '')
    const [merchant, setMerchant] = useState(transaction?.merchant ?? '')
    const [note, setNote] = useState(transaction?.note ?? '')
    const [frequency, setFrequency] = useState<RecurringFrequency>(transaction?.frequency ?? 'MONTHLY')
    const [intervalCount, setIntervalCount] = useState(transaction?.intervalCount ?? 1)
    const [startDate, setStartDate] = useState(transaction?.startDate ?? localDate())
    const [endDate, setEndDate] = useState(transaction?.endDate ?? '')
    const [errors, setErrors] = useState<Errors>({})
    const [formError, setFormError] = useState('')
    const [saving, setSaving] = useState(false)
    const nameRef = useRef<HTMLInputElement>(null)

    const dialogRef = useModalAccessibility<HTMLDivElement>({
        canClose: !saving,
        initialFocusRef: nameRef,
        onClose,
        restoreFocus,
    })

    const availableAccounts = useMemo(
        () => accounts.filter((account) =>
            !account.closedAt || account.id === transaction?.accountId,
        ),
        [accounts, transaction?.accountId],
    )
    const availableCategories = useMemo(
        () => categories.filter((category) =>
            category.type === type
            && (!category.archivedAt || category.id === transaction?.categoryId),
        ),
        [categories, transaction?.categoryId, type],
    )
    const selectedAccount = accounts.find((account) => account.id === accountId)

    const changeType = (nextType: TransactionType) => {
        setType(nextType)
        const category = categories.find((item) => item.id === categoryId)
        if (category && category.type !== nextType) setCategoryId('')
    }

    const validate = (): RecurringTransactionRequest | null => {
        const nextErrors: Errors = {}
        const normalizedName = name.trim()
        const normalizedAmount = Number(amount)

        if (!normalizedName) nextErrors.name = t('transactions.recurringForm.nameRequired')
        else if (normalizedName.length > 150) nextErrors.name = t('transactions.recurringForm.nameTooLong')
        if (!accountId) nextErrors.accountId = t('transactions.recurringForm.accountRequired')
        if (!amount || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0
            || !/^\d{1,15}(?:\.\d{1,4})?$/.test(amount)) {
            nextErrors.amount = t('transactions.recurringForm.amountInvalid')
        }
        if (!startDate) nextErrors.startDate = t('transactions.recurringForm.firstRequired')
        if (endDate && startDate && endDate < startDate) {
            nextErrors.endDate = t('transactions.recurringForm.endInvalid')
        }
        const category = categories.find((item) => item.id === categoryId)
        if (category && category.type !== type) {
            nextErrors.categoryId = t('transactions.recurringForm.categoryMismatch')
        }

        setErrors(nextErrors)
        if (Object.keys(nextErrors).length) return null

        return {
            accountId,
            categoryId: categoryId || null,
            name: normalizedName,
            type,
            amount: normalizedAmount,
            merchant: merchant.trim() || null,
            note: note.trim() || null,
            frequency,
            intervalCount,
            startDate,
            endDate: endDate || null,
        }
    }

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setFormError('')
        const request = validate()
        if (!request) return

        setSaving(true)
        try {
            const saved = transaction
                ? await updateRecurringTransaction(transaction.id, {
                    ...request,
                    status: transaction.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE',
                })
                : await createRecurringTransaction(request)
            onSaved(saved, editing)
        } catch (error) {
            if (error instanceof ApiError) {
                setErrors({
                    accountId: error.fieldErrors?.accountId,
                    amount: error.fieldErrors?.amount,
                    categoryId: error.fieldErrors?.categoryId,
                    endDate: error.fieldErrors?.endDate,
                    name: error.fieldErrors?.name,
                    startDate: error.fieldErrors?.startDate,
                })
                setFormError(error.message)
            } else {
                setFormError(t('transactions.recurringForm.error'))
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="recurring-modal-layer" role="presentation">
            <div
                ref={dialogRef}
                className="recurring-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="recurring-modal-title"
                tabIndex={-1}
            >
                <header>
                    <div>
                        <h2 id="recurring-modal-title">
                            {editing ? t('transactions.recurringForm.editTitle') : t('transactions.recurringForm.newTitle')}
                        </h2>
                        <p>{t('transactions.recurringForm.description')}</p>
                    </div>
                    <button type="button" aria-label={t('transactions.recurringForm.close')} disabled={saving} onClick={onClose}>
                        <Icon name="close"/>
                    </button>
                </header>

                <form onSubmit={submit} noValidate>
                    {formError && <div className="recurring-form-error" role="alert">{formError}</div>}
                    <fieldset className="recurring-type">
                        <legend>{t('transactions.recurringForm.details')}</legend>
                        <div>
                            {(['INCOME', 'EXPENSE'] as const).map((value) => (
                                <button
                                    type="button"
                                    className={type === value ? 'active' : undefined}
                                    aria-pressed={type === value}
                                    key={value}
                                    onClick={() => changeType(value)}
                                >
                                    <Icon name={value === 'INCOME' ? 'cash' : 'wallet'}/>
                                    {value === 'INCOME' ? t('transactions.recurringForm.income') : t('transactions.recurringForm.expense')}
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <div className="recurring-field wide">
                        <label htmlFor="recurring-name">{t('transactions.recurringForm.name')}</label>
                        <input ref={nameRef} id="recurring-name" value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)}/>
                        {errors.name && <small>{errors.name}</small>}
                    </div>

                    <div className="recurring-field wide">
                        <label htmlFor="recurring-amount">{t('transactions.recurringForm.amount')}</label>
                        <div className="recurring-amount-input">
                            <span>{selectedAccount ? selectedAccount.currency : '—'}</span>
                            <input id="recurring-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} aria-invalid={Boolean(errors.amount)}/>
                        </div>
                        {errors.amount && <small>{errors.amount}</small>}
                    </div>

                    <div className="recurring-fields-grid">
                        <div className="recurring-field">
                            <label htmlFor="recurring-account">{t('transactions.recurringForm.account')}</label>
                            <Select id="recurring-account" value={accountId} onValueChange={(value) => setAccountId(value)}>
                                <SelectOption value="">{t('transactions.recurringForm.selectAccount')}</SelectOption>
                                {availableAccounts.map((account) => <SelectOption value={account.id} key={account.id}>{account.name} · {account.currency}</SelectOption>)}
                            </Select>
                            {errors.accountId && <small>{errors.accountId}</small>}
                        </div>
                        <div className="recurring-field">
                            <label htmlFor="recurring-category">{t('transactions.recurringForm.category')}</label>
                            <Select id="recurring-category" value={categoryId} onValueChange={(value) => setCategoryId(value)}>
                                <SelectOption value="">{t('transactions.recurringForm.uncategorized')}</SelectOption>
                                {availableCategories.map((category) => <SelectOption value={category.id} key={category.id}>{category.name}</SelectOption>)}
                            </Select>
                            {errors.categoryId && <small>{errors.categoryId}</small>}
                        </div>
                        <div className="recurring-field">
                            <label htmlFor="recurring-merchant">{t('transactions.recurringForm.merchant')} <span>{t('transactions.recurringForm.optional')}</span></label>
                            <input id="recurring-merchant" value={merchant} maxLength={255} onChange={(event) => setMerchant(event.target.value)}/>
                        </div>
                        <div className="recurring-field">
                            <label htmlFor="recurring-note">{t('transactions.recurringForm.note')} <span>{t('transactions.recurringForm.optional')}</span></label>
                            <input id="recurring-note" value={note} onChange={(event) => setNote(event.target.value)}/>
                        </div>
                    </div>

                    <fieldset className="recurring-frequency">
                        <legend>{t('transactions.recurringForm.schedule')}</legend>
                        <label htmlFor="recurring-interval">{t('transactions.recurringForm.every')}</label>
                        <div className="recurring-frequency-row">
                            <input id="recurring-interval" type="number" min="1" max="32767" value={intervalCount} onChange={(event) => setIntervalCount(Math.max(1, Number(event.target.value)))}/>
                            <div>
                                {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const).map((value) => (
                                    <button type="button" className={frequency === value ? 'active' : undefined} aria-pressed={frequency === value} key={value} onClick={() => setFrequency(value)}>{t(`transactions.recurringView.frequency.${value}`)}</button>
                                ))}
                            </div>
                        </div>
                    </fieldset>

                    <div className="recurring-fields-grid">
                        <div className="recurring-field">
                            <label htmlFor="recurring-start">{t('transactions.recurringForm.first')}</label>
                            <input id="recurring-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)}/>
                            {errors.startDate && <small>{errors.startDate}</small>}
                        </div>
                        <div className="recurring-field">
                            <label htmlFor="recurring-end">{t('transactions.recurringForm.end')} <span>{t('transactions.recurringForm.optional')}</span></label>
                            <input id="recurring-end" type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)}/>
                            {errors.endDate && <small>{errors.endDate}</small>}
                        </div>
                    </div>

                    <div className="recurring-preview">
                        <Icon name="repeat"/>
                        <div><small>{t('transactions.recurringForm.firstTransaction')}</small><strong>{previewDate(startDate, locale, t('transactions.recurringForm.chooseFirst'))}</strong><span>{t('transactions.recurringForm.repeat', {
                            interval: intervalCount,
                            frequency: t(`transactions.recurringView.frequencyUnit.${frequency}`, {count: intervalCount}),
                        })}</span></div>
                        <strong className={type === 'INCOME' ? 'income' : 'expense'}>{type === 'INCOME' ? '+' : '−'}{amount || '0'} {selectedAccount?.currency ?? ''}</strong>
                    </div>

                    <footer>
                        <p>{t('transactions.recurringForm.footer')}</p>
                        <button type="button" disabled={saving} onClick={onClose}>{t('transactions.recurringForm.cancel')}</button>
                        <button type="submit" disabled={saving}>{saving ? t('transactions.recurringForm.saving') : editing ? t('transactions.recurringForm.save') : t('transactions.recurringForm.create')}</button>
                    </footer>
                </form>
            </div>
        </div>
    )
}
