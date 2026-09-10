import {
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
    reverseTransfer,
} from '../api/transfersApi'
import type {Transfer} from '../api/transfersApi'
import './TransactionFormModal.css'
import './TransferFormModal.css'

type Props = {
    accounts: Account[]
    transfer: Transfer
    onClose: () => void
    onReversed: (reversal: Transfer) => void
    restoreFocus?: () => void
}

const localDateTime = (): string => {
    const now = new Date()
    const local = new Date(
        now.getTime() - now.getTimezoneOffset() * 60_000,
    )

    return local.toISOString().slice(0, 16)
}

export function ReverseTransferDialog({
    accounts,
    transfer,
    onClose,
    onReversed,
    restoreFocus,
}: Props) {
    const {t} = useTranslation()
    const [note, setNote] = useState('')
    const [occurredAt, setOccurredAt] = useState(localDateTime)
    const [dateError, setDateError] = useState('')
    const [formError, setFormError] = useState('')
    const [saving, setSaving] = useState(false)
    const noteRef = useRef<HTMLInputElement>(null)
    const dialogRef = useModalAccessibility<HTMLDivElement>({
        canClose: !saving,
        initialFocusRef: noteRef,
        onClose,
        restoreFocus,
    })
    const source = accounts.find((account) => account.id === transfer.sourceAccountId)
    const destination = accounts.find((account) => account.id === transfer.destinationAccountId)

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setDateError('')
        setFormError('')
        const date = new Date(occurredAt)

        if (!occurredAt || Number.isNaN(date.getTime())) {
            setDateError(t('transactions.reverseDialog.dateInvalid'))
            return
        }

        setSaving(true)
        try {
            onReversed(await reverseTransfer(transfer.id, {
                note: note.trim() || null,
                occurredAt: date.toISOString(),
            }))
        } catch (error) {
            if (error instanceof ApiError) {
                setDateError(error.fieldErrors?.occurredAt ?? '')
                setFormError(error.message)
            } else {
                setFormError(t('transactions.reverseDialog.error'))
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
                aria-labelledby="reverse-transfer-title"
                tabIndex={-1}
            >
                <header className="transaction-modal-heading">
                    <div>
                        <h2 id="reverse-transfer-title">{t('transactions.reverseDialog.title')}</h2>
                        <p>{t('transactions.reverseDialog.description')}</p>
                    </div>
                    <button type="button" aria-label={t('transactions.reverseDialog.close')} disabled={saving} onClick={onClose}>
                        <Icon name="close"/>
                    </button>
                </header>

                <form onSubmit={submit} noValidate>
                    <div className="transfer-reversal-summary">
                        <span><Icon name="transfer"/></span>
                        <div>
                            <strong>{source?.name ?? t('transactions.unknownAccount')} → {destination?.name ?? t('transactions.unknownAccount')}</strong>
                            <p>{transfer.amount} {transfer.currency}{transfer.note ? ` · ${transfer.note}` : ''}</p>
                        </div>
                    </div>

                    <div className="transaction-form-grid">
                        <div className="transaction-form-field">
                            <label htmlFor="reversal-date">{t('transactions.reverseDialog.dateTime')}</label>
                            <div className="transaction-date-shell">
                                <Icon name="calendar"/>
                                <input
                                    id="reversal-date"
                                    type="datetime-local"
                                    value={occurredAt}
                                    aria-invalid={Boolean(dateError)}
                                    onChange={(event) => setOccurredAt(event.target.value)}
                                />
                            </div>
                            {dateError && <small className="transaction-field-error">{dateError}</small>}
                        </div>
                        <div className="transaction-form-field">
                            <label htmlFor="reversal-note">{t('transactions.reverseDialog.reason')} <span>{t('transactions.reverseDialog.optional')}</span></label>
                            <input
                                ref={noteRef}
                                id="reversal-note"
                                value={note}
                                placeholder={t('transactions.reverseDialog.placeholder')}
                                onChange={(event) => setNote(event.target.value)}
                            />
                        </div>
                    </div>

                    <div className="transaction-balance-note transfer-reversal-note">
                        <span><Icon name="alert"/></span>
                        <div>
                            <strong>{t('transactions.reverseDialog.infoTitle')}</strong>
                            <p>{t('transactions.reverseDialog.infoDescription')}</p>
                        </div>
                    </div>

                    {formError && <p className="transaction-form-error" role="alert"><Icon name="alert"/>{formError}</p>}

                    <div className="transaction-modal-actions">
                        <button type="button" disabled={saving} onClick={onClose}>{t('transactions.reverseDialog.keep')}</button>
                        <button className="primary transfer-reverse-button" type="submit" disabled={saving}>
                            {saving ? t('transactions.reverseDialog.reversing') : t('transactions.reverseDialog.action')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
