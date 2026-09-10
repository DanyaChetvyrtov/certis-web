import {Select, SelectOption} from '../../../components/Select'
import {
    useMemo,
    useRef,
    useState,
} from 'react'
import type {FormEvent} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import {ApiError} from '../../../shared/api/ApiError'
import {useModalAccessibility} from '../../../shared/hooks/useModalAccessibility'
import type {Account} from '../../accounts/api/accountsApi'
import {
    createTransfer,
} from '../api/transfersApi'
import type {
    CreateTransferRequest,
    Transfer,
} from '../api/transfersApi'
import './TransactionFormModal.css'
import './TransferFormModal.css'

type Props = {
    accounts: Account[]
    onClose: () => void
    onSaved: (transfer: Transfer) => void
    restoreFocus?: () => void
}

type FieldErrors = Partial<Record<
    'sourceAccountId' | 'destinationAccountId' | 'amount' | 'occurredAt',
    string
>>

const toDateTimeLocalValue = (dateValue: string): string => {
    const date = new Date(dateValue)
    const localDate = new Date(
        date.getTime() - date.getTimezoneOffset() * 60_000,
    )

    return localDate.toISOString().slice(0, 16)
}

const accountLabel = (account: Account): string =>
    `${account.name} · ${account.currency}`

export function TransferFormModal({
    accounts,
    onClose,
    onSaved,
    restoreFocus,
}: Props) {
    const {t} = useTranslation()
    const activeAccounts = useMemo(
        () => accounts.filter((account) => !account.closedAt),
        [accounts],
    )
    const [sourceAccountId, setSourceAccountId] = useState('')
    const [destinationAccountId, setDestinationAccountId] = useState('')
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')
    const [occurredAt, setOccurredAt] = useState(
        () => toDateTimeLocalValue(new Date().toISOString()),
    )
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
    const [formError, setFormError] = useState('')
    const [saving, setSaving] = useState(false)
    const sourceRef = useRef<HTMLButtonElement>(null)

    const dialogRef = useModalAccessibility<HTMLDivElement>({
        canClose: !saving,
        initialFocusRef: sourceRef,
        onClose,
        restoreFocus,
    })

    const sourceAccount = activeAccounts.find(
        (account) => account.id === sourceAccountId,
    )
    const destinationAccounts = activeAccounts.filter((account) =>
        account.id !== sourceAccountId
        && (!sourceAccount || account.currency === sourceAccount.currency),
    )

    const changeSource = (nextSourceId: string) => {
        setSourceAccountId(nextSourceId)
        const nextSource = activeAccounts.find(
            (account) => account.id === nextSourceId,
        )
        const destination = activeAccounts.find(
            (account) => account.id === destinationAccountId,
        )

        if (
            destination
            && (
                destination.id === nextSourceId
                || destination.currency !== nextSource?.currency
            )
        ) {
            setDestinationAccountId('')
        }
    }

    const validate = (): CreateTransferRequest | null => {
        const nextErrors: FieldErrors = {}
        const normalizedAmount = Number(amount)
        const destination = activeAccounts.find(
            (account) => account.id === destinationAccountId,
        )
        const date = new Date(occurredAt)

        if (!sourceAccountId) {
            nextErrors.sourceAccountId = t('transactions.transferForm.sourceRequired')
        }
        if (!destinationAccountId) {
            nextErrors.destinationAccountId = t('transactions.transferForm.destinationRequired')
        } else if (destinationAccountId === sourceAccountId) {
            nextErrors.destinationAccountId = t('transactions.transferForm.differentDestination')
        } else if (
            sourceAccount
            && destination
            && sourceAccount.currency !== destination.currency
        ) {
            nextErrors.destinationAccountId = t('transactions.transferForm.sameCurrency')
        }
        if (
            !amount
            || !Number.isFinite(normalizedAmount)
            || normalizedAmount <= 0
            || !/^\d{1,15}(?:\.\d{1,4})?$/.test(amount)
        ) {
            nextErrors.amount = t('transactions.form.amountInvalid')
        }
        if (!occurredAt || Number.isNaN(date.getTime())) {
            nextErrors.occurredAt = t('transactions.form.dateInvalid')
        }

        setFieldErrors(nextErrors)
        if (Object.keys(nextErrors).length) return null

        return {
            sourceAccountId,
            destinationAccountId,
            amount: normalizedAmount,
            note: note.trim() || null,
            occurredAt: date.toISOString(),
        }
    }

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setFormError('')
        const request = validate()

        if (!request) return

        setSaving(true)
        try {
            onSaved(await createTransfer(request))
        } catch (error) {
            if (error instanceof ApiError) {
                setFieldErrors({
                    sourceAccountId: error.fieldErrors?.sourceAccountId,
                    destinationAccountId: error.fieldErrors?.destinationAccountId,
                    amount: error.fieldErrors?.amount,
                    occurredAt: error.fieldErrors?.occurredAt,
                })
                setFormError(error.message)
            } else {
                setFormError(t('transactions.transferForm.error'))
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="transaction-modal-layer" role="presentation">
            <div
                ref={dialogRef}
                className="transaction-modal transfer-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="transfer-modal-title"
                tabIndex={-1}
            >
                <header className="transaction-modal-heading">
                    <div>
                        <h2 id="transfer-modal-title">{t('transactions.transferForm.title')}</h2>
                        <p>{t('transactions.transferForm.description')}</p>
                    </div>
                    <button type="button" aria-label={t('transactions.transferForm.close')} disabled={saving} onClick={onClose}>
                        <Icon name="close"/>
                    </button>
                </header>

                <form onSubmit={submit} noValidate>
                    <div className="transfer-route-grid">
                        <div className="transaction-form-field">
                            <label htmlFor="transfer-source">{t('transactions.transferForm.from')}</label>
                            <div className="transaction-select-shell">
                                <Icon name="wallet"/>
                                <Select
                                    ref={sourceRef}
                                    id="transfer-source"
                                    value={sourceAccountId}
                                    aria-invalid={Boolean(fieldErrors.sourceAccountId)}
                                    onValueChange={(value) => changeSource(value)}
                                >
                                    <SelectOption value="">{t('transactions.transferForm.selectSource')}</SelectOption>
                                    {activeAccounts.map((account) => (
                                        <SelectOption value={account.id} key={account.id}>
                                            {accountLabel(account)}
                                        </SelectOption>
                                    ))}
                                </Select>
                            </div>
                            {fieldErrors.sourceAccountId && <small className="transaction-field-error">{fieldErrors.sourceAccountId}</small>}
                        </div>

                        <span className="transfer-direction" aria-hidden="true"><Icon name="arrow-right"/></span>

                        <div className="transaction-form-field">
                            <label htmlFor="transfer-destination">{t('transactions.transferForm.to')}</label>
                            <div className="transaction-select-shell">
                                <Icon name="bank"/>
                                <Select
                                    id="transfer-destination"
                                    value={destinationAccountId}
                                    aria-invalid={Boolean(fieldErrors.destinationAccountId)}
                                    onValueChange={(value) => setDestinationAccountId(value)}
                                >
                                    <SelectOption value="">{t('transactions.transferForm.selectDestination')}</SelectOption>
                                    {destinationAccounts.map((account) => (
                                        <SelectOption value={account.id} key={account.id}>
                                            {accountLabel(account)}
                                        </SelectOption>
                                    ))}
                                </Select>
                            </div>
                            {fieldErrors.destinationAccountId && <small className="transaction-field-error">{fieldErrors.destinationAccountId}</small>}
                        </div>
                    </div>

                    <div className="transaction-form-field transaction-amount-field">
                        <label htmlFor="transfer-amount">{t('transactions.transferForm.amount')}</label>
                        <div className={fieldErrors.amount ? 'transaction-amount-input error' : 'transaction-amount-input'}>
                            <span>{sourceAccount ? sourceAccount.currency : '—'}</span>
                            <input
                                id="transfer-amount"
                                inputMode="decimal"
                                placeholder="0.00"
                                value={amount}
                                aria-invalid={Boolean(fieldErrors.amount)}
                                onChange={(event) => setAmount(event.target.value)}
                            />
                            <strong>{sourceAccount?.currency ?? t('transactions.transferForm.currency')}</strong>
                        </div>
                        {fieldErrors.amount && <small className="transaction-field-error">{fieldErrors.amount}</small>}
                    </div>

                    <div className="transaction-form-grid">
                        <div className="transaction-form-field">
                            <label htmlFor="transfer-date">{t('transactions.transferForm.dateTime')}</label>
                            <div className="transaction-date-shell">
                                <Icon name="calendar"/>
                                <input
                                    id="transfer-date"
                                    type="datetime-local"
                                    value={occurredAt}
                                    aria-invalid={Boolean(fieldErrors.occurredAt)}
                                    onChange={(event) => setOccurredAt(event.target.value)}
                                />
                            </div>
                            {fieldErrors.occurredAt && <small className="transaction-field-error">{fieldErrors.occurredAt}</small>}
                        </div>
                        <div className="transaction-form-field">
                            <label htmlFor="transfer-note">{t('transactions.transferForm.note')} <span>{t('transactions.transferForm.optional')}</span></label>
                            <input
                                id="transfer-note"
                                value={note}
                                placeholder={t('transactions.transferForm.notePlaceholder')}
                                onChange={(event) => setNote(event.target.value)}
                            />
                        </div>
                    </div>

                    <div className="transaction-balance-note">
                        <span><Icon name="transfer"/></span>
                        <div>
                            <strong>{t('transactions.transferForm.infoTitle')}</strong>
                            <p>{t('transactions.transferForm.infoDescription')}</p>
                        </div>
                    </div>

                    {activeAccounts.length < 2 && (
                        <p className="transaction-form-error" role="alert">
                            <Icon name="alert"/>{t('transactions.transferForm.accountsNeeded')}
                        </p>
                    )}
                    {formError && <p className="transaction-form-error" role="alert"><Icon name="alert"/>{formError}</p>}

                    <div className="transaction-modal-actions">
                        <button type="button" disabled={saving} onClick={onClose}>{t('transactions.transferForm.cancel')}</button>
                        <button className="primary" type="submit" disabled={saving || activeAccounts.length < 2}>
                            {saving ? t('transactions.transferForm.transferring') : t('transactions.transferForm.action')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
