import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../../../components/Icons'
import { ApiError } from '../../../shared/api/ApiError'
import {
  accountTypes,
  accountTypeLabels,
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

type AccountFormModalProps = {
  account?: Account
  onClose: () => void
  onSaved: (account: Account) => void
}

type FieldErrors = Partial<Record<'name' | 'openingBalance', string>>

const balancePattern = /^-?\d{1,15}([.,]\d{1,4})?$/

export function AccountFormModal({
  account,
  onClose,
  onSaved,
}: AccountFormModalProps) {
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

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isSaving, onClose])

  const validate = () => {
    const errors: FieldErrors = {}
    const normalizedName = name.trim()

    if (!normalizedName) {
      errors.name = 'Enter an account name.'
    } else if (normalizedName.length > 100) {
      errors.name = 'Use no more than 100 characters.'
    }

    if (!balancePattern.test(openingBalance.trim())) {
      errors.openingBalance = 'Use up to 15 digits and 4 decimal places.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')

    if (!validate()) {
      return
    }

    setIsSaving(true)
    const request = {
      name: name.trim(),
      type,
      openingBalance: Number(openingBalance.replace(',', '.')),
    }

    try {
      const savedAccount = account
        ? await updateAccount(account.id, request)
        : await createAccount({ ...request, currency })
      onSaved(savedAccount)
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message)
        setFieldErrors({
          name: error.fieldErrors?.name,
          openingBalance: error.fieldErrors?.openingBalance,
        })
      } else {
        setFormError('We could not save this account. Please try again.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="account-modal-layer" role="presentation">
      <div
        className="account-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-modal-title"
      >
        <div className="account-modal-heading">
          <div>
            <p>Money source</p>
            <h2 id="account-modal-title">
              {isEditing ? 'Edit account' : 'Create a new account'}
            </h2>
          </div>
          <button
            className="account-modal-close"
            type="button"
            aria-label="Close account form"
            disabled={isSaving}
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={submit} noValidate>
          <label className="account-form-field">
            <span>Account name</span>
            <input
              autoFocus
              name="name"
              maxLength={100}
              placeholder="For example, Main card"
              value={name}
              aria-invalid={Boolean(fieldErrors.name)}
              onChange={(event) => setName(event.target.value)}
            />
            {fieldErrors.name && <small>{fieldErrors.name}</small>}
          </label>

          <fieldset className="account-type-fieldset">
            <legend>Account type</legend>
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
                  <strong>{accountTypeLabels[accountType]}</strong>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="account-form-row">
            <label className="account-form-field">
              <span>Opening balance</span>
              <input
                inputMode="decimal"
                name="openingBalance"
                placeholder="0.00"
                value={openingBalance}
                aria-invalid={Boolean(fieldErrors.openingBalance)}
                onChange={(event) => setOpeningBalance(event.target.value)}
              />
              {fieldErrors.openingBalance && (
                <small>{fieldErrors.openingBalance}</small>
              )}
            </label>

            <label className="account-form-field">
              <span>Currency</span>
              <select
                name="currency"
                value={currency}
                disabled={isEditing}
                onChange={(event) => setCurrency(event.target.value as Currency)}
              >
                {currencies.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              {isEditing && <small className="field-hint">Currency cannot be changed.</small>}
            </label>
          </div>

          {formError && (
            <p className="account-form-error" role="alert">
              <Icon name="alert" />
              {formError}
            </p>
          )}

          <div className="account-modal-actions">
            <button type="button" disabled={isSaving} onClick={onClose}>
              Cancel
            </button>
            <button className="primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
