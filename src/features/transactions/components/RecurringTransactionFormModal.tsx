import {useMemo, useRef, useState} from 'react'
import type {FormEvent} from 'react'
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

const frequencyLabel: Record<RecurringFrequency, string> = {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
}

const previewDate = (value: string) => {
    if (!value) return 'Choose the first occurrence'

    return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
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

        if (!normalizedName) nextErrors.name = 'Enter a schedule name.'
        else if (normalizedName.length > 150) nextErrors.name = 'Use no more than 150 characters.'
        if (!accountId) nextErrors.accountId = 'Select an account.'
        if (!amount || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0
            || !/^\d{1,15}(?:\.\d{1,4})?$/.test(amount)) {
            nextErrors.amount = 'Enter a positive amount with up to 4 decimal places.'
        }
        if (!startDate) nextErrors.startDate = 'Choose the first occurrence.'
        if (endDate && startDate && endDate < startDate) {
            nextErrors.endDate = 'End date cannot be before the first occurrence.'
        }
        const category = categories.find((item) => item.id === categoryId)
        if (category && category.type !== type) {
            nextErrors.categoryId = 'Choose a category with the same type.'
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
                setFormError('We could not save this schedule. Please try again.')
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
                            {editing ? 'Edit recurring transaction' : 'New recurring transaction'}
                        </h2>
                        <p>Set it once — Certis will create a real transaction on every due date.</p>
                    </div>
                    <button type="button" aria-label="Close recurring transaction form" disabled={saving} onClick={onClose}>
                        <Icon name="close"/>
                    </button>
                </header>

                <form onSubmit={submit} noValidate>
                    {formError && <div className="recurring-form-error" role="alert">{formError}</div>}
                    <fieldset className="recurring-type">
                        <legend>Transaction details</legend>
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
                                    {value === 'INCOME' ? 'Income' : 'Expense'}
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <div className="recurring-field wide">
                        <label htmlFor="recurring-name">Name</label>
                        <input ref={nameRef} id="recurring-name" value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)}/>
                        {errors.name && <small>{errors.name}</small>}
                    </div>

                    <div className="recurring-field wide">
                        <label htmlFor="recurring-amount">Amount</label>
                        <div className="recurring-amount-input">
                            <span>{selectedAccount ? selectedAccount.currency : '—'}</span>
                            <input id="recurring-amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} aria-invalid={Boolean(errors.amount)}/>
                        </div>
                        {errors.amount && <small>{errors.amount}</small>}
                    </div>

                    <div className="recurring-fields-grid">
                        <div className="recurring-field">
                            <label htmlFor="recurring-account">Account</label>
                            <select id="recurring-account" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                                <option value="">Select account</option>
                                {availableAccounts.map((account) => <option value={account.id} key={account.id}>{account.name} · {account.currency}</option>)}
                            </select>
                            {errors.accountId && <small>{errors.accountId}</small>}
                        </div>
                        <div className="recurring-field">
                            <label htmlFor="recurring-category">Category</label>
                            <select id="recurring-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                                <option value="">Uncategorized</option>
                                {availableCategories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
                            </select>
                            {errors.categoryId && <small>{errors.categoryId}</small>}
                        </div>
                        <div className="recurring-field">
                            <label htmlFor="recurring-merchant">Merchant <span>Optional</span></label>
                            <input id="recurring-merchant" value={merchant} maxLength={255} onChange={(event) => setMerchant(event.target.value)}/>
                        </div>
                        <div className="recurring-field">
                            <label htmlFor="recurring-note">Note <span>Optional</span></label>
                            <input id="recurring-note" value={note} onChange={(event) => setNote(event.target.value)}/>
                        </div>
                    </div>

                    <fieldset className="recurring-frequency">
                        <legend>Schedule</legend>
                        <label htmlFor="recurring-interval">Every</label>
                        <div className="recurring-frequency-row">
                            <input id="recurring-interval" type="number" min="1" max="32767" value={intervalCount} onChange={(event) => setIntervalCount(Math.max(1, Number(event.target.value)))}/>
                            <div>
                                {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const).map((value) => (
                                    <button type="button" className={frequency === value ? 'active' : undefined} aria-pressed={frequency === value} key={value} onClick={() => setFrequency(value)}>{value[0]}{value.slice(1).toLowerCase()}</button>
                                ))}
                            </div>
                        </div>
                    </fieldset>

                    <div className="recurring-fields-grid">
                        <div className="recurring-field">
                            <label htmlFor="recurring-start">First occurrence</label>
                            <input id="recurring-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)}/>
                            {errors.startDate && <small>{errors.startDate}</small>}
                        </div>
                        <div className="recurring-field">
                            <label htmlFor="recurring-end">End date <span>Optional</span></label>
                            <input id="recurring-end" type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)}/>
                            {errors.endDate && <small>{errors.endDate}</small>}
                        </div>
                    </div>

                    <div className="recurring-preview">
                        <Icon name="repeat"/>
                        <div><small>First transaction</small><strong>{previewDate(startDate)}</strong><span>Then repeats every {intervalCount > 1 ? `${intervalCount} ` : ''}{frequencyLabel[frequency]} · Future transactions only</span></div>
                        <strong className={type === 'INCOME' ? 'income' : 'expense'}>{type === 'INCOME' ? '+' : '−'}{amount || '0'} {selectedAccount?.currency ?? ''}</strong>
                    </div>

                    <footer>
                        <p>The schedule can be paused or edited at any time.</p>
                        <button type="button" disabled={saving} onClick={onClose}>Cancel</button>
                        <button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create schedule'}</button>
                    </footer>
                </form>
            </div>
        </div>
    )
}
