import {Select, SelectOption} from '../../../components/Select'
import {
    useMemo,
    useRef,
    useState,
} from 'react'
import type {
    FormEvent,
} from 'react'
import {useTranslation} from 'react-i18next'
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
    const {t} = useTranslation()
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
            ? toDateTimeLocalValue(transaction.occurredAt)
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
            nextErrors.accountId = t('transactions.form.accountRequired')
        }

        if (
            !amount
            || !Number.isFinite(normalizedAmount)
            || normalizedAmount <= 0
            || !/^\d{1,15}(?:\.\d{1,4})?$/.test(amount)
        ) {
            nextErrors.amount =
                t('transactions.form.amountInvalid')
        }

        if (normalizedMerchant.length > 255) {
            nextErrors.merchant =
                t('transactions.form.merchantTooLong')
        }

        const selectedCategory = categories.find(
            (category) => category.id === categoryId,
        )

        if (
            selectedCategory
            && selectedCategory.type !== type
        ) {
            nextErrors.categoryId =
                t('transactions.form.categoryMismatch')
        }

        const transactionDate = new Date(date)

        if (!date || Number.isNaN(transactionDate.getTime())) {
            nextErrors.date = t('transactions.form.dateInvalid')
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
            occurredAt: transactionDate.toISOString(),
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
                    date: error.fieldErrors?.occurredAt,
                    merchant: fieldErrorMessage(
                        error.fieldErrors,
                        'merchant',
                    ),
                })
                setFormError(error.message)
            } else {
                setFormError(
                    isEditing
                        ? t('transactions.form.updateError')
                        : t('transactions.form.createError'),
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
                className="transaction-modal transaction-form-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="transaction-modal-title"
                tabIndex={-1}
            >
                <header className="transaction-modal-heading">
                    <div>
                        <h2 id="transaction-modal-title">
                            {isEditing
                                ? t('transactions.form.editTitle')
                                : t('transactions.form.newTitle')}
                        </h2>
                        <p>
                            {isEditing
                                ? t('transactions.form.editDescription')
                                : t('transactions.form.newDescription')}
                        </p>
                    </div>

                    <button
                        type="button"
                        aria-label={t('transactions.form.close')}
                        disabled={isSaving}
                        onClick={onClose}
                    >
                        <Icon name="close"/>
                    </button>
                </header>

                <form onSubmit={submit} noValidate>
                    <fieldset className="transaction-type-fieldset">
                        <legend>{t('transactions.form.type')}</legend>
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
                                {t('transactions.form.expense')}
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
                                {t('transactions.form.income')}
                            </label>
                        </div>
                    </fieldset>

                    <div className="transaction-form-field transaction-amount-field">
                        <label htmlFor="transaction-amount">
                            {t('transactions.form.amount')}
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
                                {t('transactions.form.account')}
                            </label>
                            <div className="transaction-select-shell">
                                <Icon name="card"/>
                                <Select
                                    id="transaction-account"
                                    name="accountId"
                                    value={accountId}
                                    aria-invalid={Boolean(fieldErrors.accountId)}
                                    aria-describedby={
                                        fieldErrors.accountId
                                            ? 'transaction-account-error'
                                            : undefined
                                    }
                                    onValueChange={(value) => {
                                        setAccountId(value)
                                        clearFieldError('accountId')
                                    }}
                                >
                                    <SelectOption value="">
                                        {t('transactions.form.selectAccount')}
                                    </SelectOption>
                                    {availableAccounts.map((account) => (
                                        <SelectOption
                                            value={account.id}
                                            key={account.id}
                                        >
                                            {account.name} · {account.currency}
                                            {account.closedAt ? ` · ${t('transactions.form.closed')}` : ''}
                                        </SelectOption>
                                    ))}
                                </Select>
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
                                {t('transactions.form.category')} <span>{t('transactions.form.optional')}</span>
                            </label>
                            <div className="transaction-select-shell">
                                <Icon name="tag"/>
                                <Select
                                    id="transaction-category"
                                    name="categoryId"
                                    value={categoryId}
                                    aria-invalid={Boolean(fieldErrors.categoryId)}
                                    aria-describedby={
                                        fieldErrors.categoryId
                                            ? 'transaction-category-error'
                                            : undefined
                                    }
                                    onValueChange={(value) => {
                                        setCategoryId(value)
                                        clearFieldError('categoryId')
                                    }}
                                >
                                    <SelectOption value="">
                                        {t('transactions.form.noCategory')}
                                    </SelectOption>
                                    {availableCategories.map((category) => (
                                        <SelectOption
                                            value={category.id}
                                            key={category.id}
                                        >
                                            {category.name}
                                            {category.archivedAt ? ` · ${t('transactions.form.archived')}` : ''}
                                        </SelectOption>
                                    ))}
                                </Select>
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
                                {t('transactions.form.merchant')} <span>{t('transactions.form.optional')}</span>
                            </label>
                            <input
                                id="transaction-merchant"
                                name="merchant"
                                value={merchant}
                                maxLength={255}
                                placeholder={t('transactions.form.merchantPlaceholder')}
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
                                {t('transactions.form.dateTime')}
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
                            {t('transactions.form.note')} <span>{t('transactions.form.optional')}</span>
                        </label>
                        <textarea
                            id="transaction-note"
                            name="note"
                            value={note}
                            placeholder={t('transactions.form.notePlaceholder')}
                            onChange={(event) => setNote(event.target.value)}
                        />
                    </div>

                    <section className="transaction-balance-note">
                        <span><Icon name="repeat"/></span>
                        <div>
                            <strong>
                                {t('transactions.form.balanceTitle')}
                            </strong>
                            <p>
                                {t('transactions.form.balanceDescription')}
                            </p>
                        </div>
                    </section>

                    {availableAccounts.length === 0 && (
                        <p
                            className="transaction-form-error"
                            role="alert"
                        >
                            <Icon name="alert"/>
                            {t('transactions.form.accountNeeded')}
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
                            {t('transactions.form.cancel')}
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
                                    ? t('transactions.form.saving')
                                    : t('transactions.form.adding')
                                : isEditing
                                    ? t('transactions.form.save')
                                    : t('transactions.form.add')}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    )
}
