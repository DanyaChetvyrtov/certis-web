import {Select, SelectOption} from '../../../components/Select'
import type {FormEvent} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import {ApiError} from '../../../shared/api/ApiError'
import {
    accountTypes,
    createAccount,
    currencies,
    updateAccount,
} from '../api/accountsApi'
import type {
    Account,
    AccountType,
    Currency,
} from '../api/accountsApi'
import './AccountModals.css'
import {
    useRef,
    useState,
} from 'react'

import {
    useModalAccessibility,
} from '../../../shared/hooks/useModalAccessibility'

type AccountFormModalProps = {
    account?: Account
    onClose: () => void
    onSaved: (
        account: Account,
    ) => void
    restoreFocus?: () => void
}

type AccountField =
    | 'name'
    | 'openingBalance'

type FieldErrors = Partial<Record<AccountField, string>>

const ACCOUNT_FIELD_ORDER:
    readonly AccountField[] = [
    'name',
    'openingBalance',
]

const NAME_ID = 'account-name'
const NAME_ERROR_ID = `${NAME_ID}-error`

const CURRENCY_ID = 'account-currency'
const CURRENCY_HINT_ID = `${CURRENCY_ID}-hint`

const BALANCE_ID = 'account-opening-balance'
const BALANCE_ERROR_ID =
    `${BALANCE_ID}-error`

const getFirstErrorField = (
    errors: FieldErrors,
): AccountField | null =>
    ACCOUNT_FIELD_ORDER.find(
        (field) => Boolean(errors[field]),
    ) ?? null

const balancePattern = /^-?\d{1,15}([.,]\d{1,4})?$/

export function AccountFormModal({
                                     account,
                                     onClose,
                                     onSaved,
                                     restoreFocus,
                                 }: AccountFormModalProps) {
    const {t} = useTranslation()
    const [name, setName] = useState(account?.name ?? '')

    const [type, setType] = useState<AccountType>(account?.type ?? 'CARD')
    const [currency, setCurrency] = useState<Currency>(account?.currency ?? 'RUB')
    const [openingBalance, setOpeningBalance] = useState(
        String(account?.openingBalance ?? 0),
    )
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
    const [formError, setFormError] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const isEditing = Boolean(account)

    const setFieldError = (
        field: AccountField,
        error?: string,
    ): void => {
        setFieldErrors((current) => ({
            ...current,
            [field]: error,
        }))
    }

    const nameInputRef = useRef<HTMLInputElement>(null)

    const dialogRef =
        useModalAccessibility<HTMLDivElement>({
            canClose: !isSaving,
            initialFocusRef: nameInputRef,
            onClose,
            restoreFocus,
        })

    const focusField = (
        field: AccountField,
    ): void => {
        dialogRef.current
            ?.querySelector<HTMLInputElement>(
                `[name="${field}"]`,
            )
            ?.focus()
    }

    const validate = (): FieldErrors => {
        const errors: FieldErrors = {}
        const normalizedName =
            name.trim()

        if (!normalizedName) {
            errors.name =
                t('accounts.form.nameRequired')
        } else if (
            normalizedName.length > 100
        ) {
            errors.name =
                t('accounts.form.nameTooLong')
        }

        if (
            !balancePattern.test(
                openingBalance.trim(),
            )
        ) {
            errors.openingBalance =
                t('accounts.form.balanceInvalid')
        }

        setFieldErrors(errors)

        return errors
    }

    const submit = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault()
        setFormError('')

        const validationErrors =
            validate()

        const firstError =
            getFirstErrorField(
                validationErrors,
            )

        if (firstError) {
            focusField(firstError)
            return
        }

        setIsSaving(true)

        const request = {
            name: name.trim(),
            type,
            openingBalance: Number(
                openingBalance.replace(
                    ',',
                    '.',
                ),
            ),
        }

        try {
            const savedAccount = account
                ? await updateAccount(
                    account.id,
                    request,
                )
                : await createAccount({
                    ...request,
                    currency,
                })

            onSaved(savedAccount)
        } catch (error) {
            if (error instanceof ApiError) {
                const backendErrors:
                    FieldErrors = {
                    name:
                    error.fieldErrors
                        ?.name,
                    openingBalance:
                    error.fieldErrors
                        ?.openingBalance,
                }

                setFormError(error.message)
                setFieldErrors(
                    backendErrors,
                )

                const firstBackendError =
                    getFirstErrorField(
                        backendErrors,
                    )

                if (firstBackendError) {
                    focusField(firstBackendError)
                }
            } else {
                setFormError(
                    t('accounts.form.saveError'),
                )
            }
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="account-modal-layer" role="presentation">
            <div
                ref={dialogRef}
                className="account-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="account-modal-title"
                tabIndex={-1}
            >
                <div className="account-modal-heading">
                    <div>
                        <p>{t('accounts.form.eyebrow')}</p>
                        <h2 id="account-modal-title">
                            {isEditing ? t('accounts.form.editTitle') : t('accounts.form.createTitle')}
                        </h2>
                    </div>
                    <button
                        className="account-modal-close"
                        type="button"
                        aria-label={t('accounts.form.close')}
                        disabled={isSaving}
                        onClick={onClose}
                    >
                        <Icon name="close"/>
                    </button>
                </div>

                <form onSubmit={submit} noValidate>
                    <div className="account-form-field">
                        <label htmlFor={NAME_ID}>
                            {t('accounts.form.name')}
                        </label>

                        <input
                            ref={nameInputRef}
                            id={NAME_ID}
                            name="name"
                            value={name}
                            onChange={(event) => {
                                setName(event.target.value)

                                setFieldError(
                                    'name',
                                    undefined,
                                )
                            }}
                            aria-invalid={
                                Boolean(fieldErrors.name)
                            }
                            aria-describedby={
                                fieldErrors.name
                                    ? NAME_ERROR_ID
                                    : undefined
                            }
                            placeholder={t('accounts.form.namePlaceholder')}
                            maxLength={100}
                        />

                        {fieldErrors.name && (
                            <small
                                id={NAME_ERROR_ID}
                                className="field-error"
                            >
                                {fieldErrors.name}
                            </small>
                        )}
                    </div>

                    <fieldset className="account-type-fieldset">
                        <legend>{t('accounts.form.type')}</legend>
                        <div className="account-type-grid">
                            {accountTypes.map((accountType) => (
                                <label
                                    className={type === accountType ? 'selected' : undefined}
                                    key={accountType}
                                >
                                    <input
                                        type="radio"
                                        name="type"
                                        value={accountType}
                                        checked={type === accountType}
                                        onChange={() => setType(accountType)}
                                    />
                                    <span className={`account-type-icon type-${accountType.toLowerCase()}`}>
                    <Icon
                        name={accountType === 'CARD'
                            ? 'card'
                            : accountType === 'CASH'
                                ? 'cash'
                                : accountType === 'BANK'
                                    ? 'bank'
                                    : 'gauge'}
                    />
                  </span>
                                    <strong>{t(`accounts.types.${accountType}`)}</strong>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <div className="account-form-row">
                        <div className="account-form-field">
                            <label htmlFor={BALANCE_ID}>
                                {t('accounts.form.openingBalance')}
                            </label>

                            <input
                                id={BALANCE_ID}
                                inputMode="decimal"
                                name="openingBalance"
                                placeholder="0.00"
                                value={openingBalance}
                                aria-invalid={
                                    Boolean(
                                        fieldErrors.openingBalance,
                                    )
                                }
                                aria-describedby={
                                    fieldErrors.openingBalance
                                        ? BALANCE_ERROR_ID
                                        : undefined
                                }
                                onChange={(event) => {
                                    setOpeningBalance(
                                        event.target.value,
                                    )

                                    setFieldError(
                                        'openingBalance',
                                        undefined,
                                    )
                                }}
                            />

                            {fieldErrors.openingBalance && (
                                <small id={BALANCE_ERROR_ID}>
                                    {
                                        fieldErrors
                                            .openingBalance
                                    }
                                </small>
                            )}
                        </div>

                        <div className="account-form-field">
                            <label htmlFor={CURRENCY_ID}>
                                {t('accounts.form.currency')}
                            </label>

                            <Select
                                id={CURRENCY_ID}
                                name="currency"
                                value={currency}
                                disabled={isEditing}
                                aria-describedby={
                                    isEditing
                                        ? CURRENCY_HINT_ID
                                        : undefined
                                }
                                onValueChange={(value) =>
                                    setCurrency(
                                        value as Currency,
                                    )
                                }
                            >
                                {currencies.map(
                                    (item) => (
                                        <SelectOption
                                            key={item}
                                            value={item}
                                        >
                                            {item}
                                        </SelectOption>
                                    ),
                                )}
                            </Select>

                            {isEditing && (
                                <small
                                    id={CURRENCY_HINT_ID}
                                    className="field-hint"
                                >
                                    {t('accounts.form.currencyLocked')}
                                </small>
                            )}
                        </div>
                    </div>

                    {formError && (
                        <p className="account-form-error" role="alert">
                            <Icon name="alert"/>
                            {formError}
                        </p>
                    )}

                    <div className="account-modal-actions">
                        <button type="button" disabled={isSaving} onClick={onClose}>
                            {t('accounts.form.cancel')}
                        </button>
                        <button className="primary" type="submit" disabled={isSaving}>
                            {isSaving ? t('accounts.form.saving') : isEditing ? t('accounts.form.saveChanges') : t('accounts.form.create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
