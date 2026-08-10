import {
    useMemo,
    useRef,
    useState,
} from 'react'
import type {
    FormEvent,
} from 'react'
import {Icon} from '../../../components/Icons'
import type {
    Account,
} from '../../accounts/api/accountsApi'
import type {
    Category,
} from '../../categories/api/categoriesApi'
import {ApiError} from '../../../shared/api/ApiError'
import {
    useModalAccessibility,
} from '../../../shared/hooks/useModalAccessibility'
import {
    createTransaction,
    updateTransaction,
} from '../api/transactionsApi'
import type {
    Transaction,
    TransactionRequest,
    TransactionType,
} from '../api/transactionsApi'
import './TransactionFormModal.css'

type TransactionFormModalProps = {
    accounts: Account[]
    categories: Category[]
    transaction?: Transaction
    onClose: () => void
    onSaved: (
        transaction: Transaction,
        isEditing: boolean,
    ) => void
    restoreFocus?: () => void
}

type FieldErrors = Partial<Record<
    | 'accountId'
    | 'amount'
    | 'categoryId'
    | 'date'
    | 'merchant',
    string
>>

const toDateTimeLocalValue = (
    dateValue: string,
): string => {
    const date = new Date(dateValue)

    if (Number.isNaN(date.getTime())) {
        return ''
    }

    const localDate = new Date(
        date.getTime() - date.getTimezoneOffset() * 60_000,
    )

    return localDate.toISOString().slice(0, 16)
}

const initialDate = (): string =>
    toDateTimeLocalValue(new Date().toISOString())

const fieldErrorMessage = (
    errors: Record<string, string> | undefined,
    field: keyof FieldErrors,
): string | undefined =>
    errors?.[field]

export function TransactionFormModal({
    accounts,
    categories,
    transaction,
    onClose,
    onSaved,
    restoreFocus,
}: TransactionFormModalProps) {
    const isEditing = Boolean(transaction)
    const [type, setType] = useState<TransactionType>(
        transaction?.type ?? 'EXPENSE',
    )
    const [amount, setAmount] = useState(
        transaction ? String(transaction.amount) : '',
    )
    const [accountId, setAccountId] = useState(
        transaction?.accountId ?? '',
    )
    const [categoryId, setCategoryId] = useState(
        transaction?.categoryId ?? '',
    )
    const [merchant, setMerchant] = useState(
        transaction?.merchant ?? '',
    )
    const [note, setNote] = useState(
        transaction?.note ?? '',
    )
    const [date, setDate] = useState(
        transaction
            ? toDateTimeLocalValue(transaction.date)
            : initialDate(),
    )
    const [fieldErrors, setFieldErrors] =
        useState<FieldErrors>({})
    const [formError, setFormError] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const amountInputRef = useRef<HTMLInputElement>(null)

    const dialogRef =
        useModalAccessibility<HTMLDivElement>({
            canClose: !isSaving,
            initialFocusRef: amountInputRef,
            onClose,
            restoreFocus,
        })

    const availableAccounts = useMemo(
        () => accounts.filter((account) =>
            !account.closedAt
            || account.id === transaction?.accountId,
        ),
        [accounts, transaction?.accountId],
    )

    const availableCategories = useMemo(
        () => categories.filter((category) =>
            category.type === type
            && (
                !category.archivedAt
                || category.id === transaction?.categoryId
            ),
        ),
        [categories, transaction?.categoryId, type],
    )

    const selectedAccount = accounts.find(
        (account) => account.id === accountId,
    )

    const clearFieldError = (
        field: keyof FieldErrors,
    ) => {
        setFieldErrors((current) => ({
            ...current,
            [field]: undefined,
        }))
    }

    const changeType = (
        nextType: TransactionType,
    ) => {
        setType(nextType)

        const selectedCategory = categories.find(
            (category) => category.id === categoryId,
        )

        if (
            selectedCategory
            && selectedCategory.type !== nextType
        ) {
            setCategoryId('')
        }

        clearFieldError('categoryId')
    }

    const validate = (): TransactionRequest | null => {
        const nextErrors: FieldErrors = {}
        const normalizedMerchant = merchant.trim()
        const normalizedNote = note.trim()
        const normalizedAmount = Number(amount)

        if (!accountId) {
            nextErrors.accountId = 'Select an account.'
        }

        if (
            !amount
            || !Number.isFinite(normalizedAmount)
            || normalizedAmount <= 0
            || !/^\d{1,15}(?:\.\d{1,4})?$/.test(amount)
        ) {
            nextErrors.amount =
                'Enter a positive amount with up to 4 decimal places.'
        }

        if (normalizedMerchant.length > 255) {
            nextErrors.merchant =
                'Use no more than 255 characters.'
        }

        const selectedCategory = categories.find(
            (category) => category.id === categoryId,
        )

        if (
            selectedCategory
            && selectedCategory.type !== type
        ) {
            nextErrors.categoryId =
                'Select a category with the same transaction type.'
        }

        const transactionDate = new Date(date)

        if (!date || Number.isNaN(transactionDate.getTime())) {
            nextErrors.date = 'Select a valid date and time.'
        }

        setFieldErrors(nextErrors)

        if (Object.keys(nextErrors).length > 0) {
            if (nextErrors.amount) {
                amountInputRef.current?.focus()
            }

            return null
        }

        return {
            accountId,
            type,
            amount: normalizedAmount,
            categoryId: categoryId || null,
            merchant: normalizedMerchant || null,
            note: normalizedNote || null,
            date: transactionDate.toISOString(),
        }
    }

    const submit = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault()
        setFormError('')

        const request = validate()

        if (!request) {
            return
        }

        setIsSaving(true)

        try {
            const savedTransaction = transaction
                ? await updateTransaction(
                    transaction.id,
                    request,
                )
                : await createTransaction(request)

            onSaved(savedTransaction, isEditing)
        } catch (error) {
            if (error instanceof ApiError) {
                setFieldErrors({
                    accountId: fieldErrorMessage(
                        error.fieldErrors,
                        'accountId',
                    ),
                    amount: fieldErrorMessage(
                        error.fieldErrors,
                        'amount',
                    ),
                    categoryId: fieldErrorMessage(
                        error.fieldErrors,
                        'categoryId',
                    ),
                    date: fieldErrorMessage(
                        error.fieldErrors,
                        'date',
                    ),
                    merchant: fieldErrorMessage(
                        error.fieldErrors,
                        'merchant',
                    ),
                })
                setFormError(error.message)
            } else {
                setFormError(
                    isEditing
                        ? 'We could not update this transaction. Please try again.'
                        : 'We could not create this transaction. Please try again.',
                )
            }
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div
            className="transaction-modal-layer"
            role="presentation"
        >
            <div
                ref={dialogRef}
                className="transaction-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="transaction-modal-title"
                tabIndex={-1}
            >
                <header className="transaction-modal-heading">
                    <div>
                        <h2 id="transaction-modal-title">
                            {isEditing
                                ? 'Edit transaction'
                                : 'New transaction'}
                        </h2>
                        <p>
                            {isEditing
                                ? 'Update this movement in your financial history.'
                                : 'Record income or an expense on one of your accounts.'}
                        </p>
                    </div>

                    <button
                        type="button"
                        aria-label="Close transaction form"
                        disabled={isSaving}
                        onClick={onClose}
                    >
                        <Icon name="close"/>
                    </button>
                </header>

                <form onSubmit={submit} noValidate>
                    <fieldset className="transaction-type-fieldset">
                        <legend>Type</legend>
                        <div className="transaction-type-options">
                            <label
                                className={
                                    type === 'EXPENSE'
                                        ? 'selected expense'
                                        : undefined
                                }
                            >
                                <input
                                    type="radio"
                                    name="transaction-type"
                                    value="EXPENSE"
                                    checked={type === 'EXPENSE'}
                                    onChange={() => changeType('EXPENSE')}
                                />
                                Expense
                            </label>

                            <label
                                className={
                                    type === 'INCOME'
                                        ? 'selected income'
                                        : undefined
                                }
                            >
                                <input
                                    type="radio"
                                    name="transaction-type"
                                    value="INCOME"
                                    checked={type === 'INCOME'}
                                    onChange={() => changeType('INCOME')}
                                />
                                Income
                            </label>
                        </div>
                    </fieldset>

                    <div className="transaction-form-field transaction-amount-field">
                        <label htmlFor="transaction-amount">
                            Amount
                        </label>
                        <div
                            className={
                                fieldErrors.amount
                                    ? 'transaction-amount-input error'
                                    : 'transaction-amount-input'
                            }
                        >
                            <span aria-hidden="true">
                                {selectedAccount?.currency === 'EUR'
                                    ? '€'
                                    : selectedAccount?.currency === 'USD'
                                        ? '$'
                                        : '₽'}
                            </span>
                            <input
                                ref={amountInputRef}
                                id="transaction-amount"
                                name="amount"
                                type="number"
                                min="0"
                                step="0.0001"
                                inputMode="decimal"
                                value={amount}
                                placeholder="0.00"
                                aria-invalid={Boolean(fieldErrors.amount)}
                                aria-describedby={
                                    fieldErrors.amount
                                        ? 'transaction-amount-error'
                                        : undefined
                                }
                                onChange={(event) => {
                                    setAmount(event.target.value)
                                    clearFieldError('amount')
                                }}
                            />
                            <strong>
                                {selectedAccount?.currency ?? '—'}
                            </strong>
                        </div>
                        {fieldErrors.amount && (
                            <small
                                id="transaction-amount-error"
                                className="transaction-field-error"
                            >
                                {fieldErrors.amount}
                            </small>
                        )}
                    </div>

                    <div className="transaction-form-grid">
                        <div className="transaction-form-field">
                            <label htmlFor="transaction-account">
                                Account
                            </label>
                            <div className="transaction-select-shell">
                                <Icon name="card"/>
                                <select
                                    id="transaction-account"
                                    name="accountId"
                                    value={accountId}
                                    aria-invalid={Boolean(fieldErrors.accountId)}
                                    aria-describedby={
                                        fieldErrors.accountId
                                            ? 'transaction-account-error'
                                            : undefined
                                    }
                                    onChange={(event) => {
                                        setAccountId(event.target.value)
                                        clearFieldError('accountId')
                                    }}
                                >
                                    <option value="">
                                        Select account
                                    </option>
                                    {availableAccounts.map((account) => (
                                        <option
                                            value={account.id}
                                            key={account.id}
                                        >
                                            {account.name} · {account.currency}
                                            {account.closedAt ? ' · Closed' : ''}
                                        </option>
                                    ))}
                                </select>
                                <Icon name="chevron-down"/>
                            </div>
                            {fieldErrors.accountId && (
                                <small
                                    id="transaction-account-error"
                                    className="transaction-field-error"
                                >
                                    {fieldErrors.accountId}
                                </small>
                            )}
                        </div>

                        <div className="transaction-form-field">
                            <label htmlFor="transaction-category">
                                Category <span>Optional</span>
                            </label>
                            <div className="transaction-select-shell">
                                <Icon name="tag"/>
                                <select
                                    id="transaction-category"
                                    name="categoryId"
                                    value={categoryId}
                                    aria-invalid={Boolean(fieldErrors.categoryId)}
                                    aria-describedby={
                                        fieldErrors.categoryId
                                            ? 'transaction-category-error'
                                            : undefined
                                    }
                                    onChange={(event) => {
                                        setCategoryId(event.target.value)
                                        clearFieldError('categoryId')
                                    }}
                                >
                                    <option value="">
                                        No category
                                    </option>
                                    {availableCategories.map((category) => (
                                        <option
                                            value={category.id}
                                            key={category.id}
                                        >
                                            {category.name}
                                            {category.archivedAt ? ' · Archived' : ''}
                                        </option>
                                    ))}
                                </select>
                                <Icon name="chevron-down"/>
                            </div>
                            {fieldErrors.categoryId && (
                                <small
                                    id="transaction-category-error"
                                    className="transaction-field-error"
                                >
                                    {fieldErrors.categoryId}
                                </small>
                            )}
                        </div>

                        <div className="transaction-form-field">
                            <label htmlFor="transaction-merchant">
                                Merchant <span>Optional</span>
                            </label>
                            <input
                                id="transaction-merchant"
                                name="merchant"
                                value={merchant}
                                maxLength={255}
                                placeholder="e.g. Greenfield Market"
                                aria-invalid={Boolean(fieldErrors.merchant)}
                                aria-describedby={
                                    fieldErrors.merchant
                                        ? 'transaction-merchant-error'
                                        : undefined
                                }
                                onChange={(event) => {
                                    setMerchant(event.target.value)
                                    clearFieldError('merchant')
                                }}
                            />
                            {fieldErrors.merchant && (
                                <small
                                    id="transaction-merchant-error"
                                    className="transaction-field-error"
                                >
                                    {fieldErrors.merchant}
                                </small>
                            )}
                        </div>

                        <div className="transaction-form-field">
                            <label htmlFor="transaction-date">
                                Date &amp; time
                            </label>
                            <div className="transaction-date-shell">
                                <Icon name="calendar"/>
                                <input
                                    id="transaction-date"
                                    name="date"
                                    type="datetime-local"
                                    value={date}
                                    aria-invalid={Boolean(fieldErrors.date)}
                                    aria-describedby={
                                        fieldErrors.date
                                            ? 'transaction-date-error'
                                            : undefined
                                    }
                                    onChange={(event) => {
                                        setDate(event.target.value)
                                        clearFieldError('date')
                                    }}
                                />
                            </div>
                            {fieldErrors.date && (
                                <small
                                    id="transaction-date-error"
                                    className="transaction-field-error"
                                >
                                    {fieldErrors.date}
                                </small>
                            )}
                        </div>
                    </div>

                    <div className="transaction-form-field transaction-note-field">
                        <label htmlFor="transaction-note">
                            Note <span>Optional</span>
                        </label>
                        <textarea
                            id="transaction-note"
                            name="note"
                            value={note}
                            placeholder="Add a note about this transaction…"
                            onChange={(event) => setNote(event.target.value)}
                        />
                    </div>

                    <section className="transaction-balance-note">
                        <span><Icon name="repeat"/></span>
                        <div>
                            <strong>
                                Account balance updates automatically
                            </strong>
                            <p>
                                The transaction becomes part of your financial history.
                            </p>
                        </div>
                    </section>

                    {availableAccounts.length === 0 && (
                        <p
                            className="transaction-form-error"
                            role="alert"
                        >
                            <Icon name="alert"/>
                            Create an active account before recording a transaction.
                        </p>
                    )}

                    {formError && (
                        <p
                            className="transaction-form-error"
                            role="alert"
                        >
                            <Icon name="alert"/>
                            {formError}
                        </p>
                    )}

                    <footer className="transaction-modal-actions">
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            className="primary"
                            type="submit"
                            disabled={
                                isSaving
                                || availableAccounts.length === 0
                            }
                        >
                            {isSaving
                                ? isEditing
                                    ? 'Saving…'
                                    : 'Adding…'
                                : isEditing
                                    ? 'Save changes'
                                    : 'Add transaction'}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    )
}
