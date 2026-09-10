import {
    useMemo,
    useRef,
    useState,
} from 'react'
import type {FormEvent} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import {useLanguage} from '../../../i18n/useLanguage'
import {Select, SelectOption} from '../../../components/Select'
import {ApiError} from '../../../shared/api/ApiError'
import {useModalAccessibility} from '../../../shared/hooks/useModalAccessibility'
import type {Account} from '../../accounts/api/accountsApi'
import {addGoalContribution} from '../api/goalsApi'
import type {Goal, GoalContributionResult} from '../api/goalsApi'
import {formatGoalMoney, goalIconName} from '../goalPresentation'
import './GoalModals.css'

type GoalContributionModalProps = {
    goal: Goal
    accounts: Account[]
    onClose: () => void
    onSaved: (result: GoalContributionResult) => void
    restoreFocus?: () => void
}

const idempotencyKey = (): string => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID()
    }

    return `goal-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function GoalContributionModal({
    goal,
    accounts,
    onClose,
    onSaved,
    restoreFocus,
}: GoalContributionModalProps) {
    const {t} = useTranslation()
    const {locale} = useLanguage()
    const eligibleAccounts = useMemo(
        () => accounts.filter((account) => (
            account.currency === goal.currency && !account.closedAt
        )),
        [accounts, goal.currency],
    )
    const [accountId, setAccountId] = useState(
        eligibleAccounts.length === 1 ? eligibleAccounts[0].id : '',
    )
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [formError, setFormError] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const amountRef = useRef<HTMLInputElement>(null)
    const requestKeyRef = useRef(idempotencyKey())

    const dialogRef = useModalAccessibility<HTMLDivElement>({
        canClose: !isSaving,
        initialFocusRef: amountRef,
        onClose,
        restoreFocus,
    })

    const numericAmount = Number(amount.replace(',', '.'))

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const errors: Record<string, string> = {}

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            errors.amount = t('goals.contribution.validation.amount')
        } else if (numericAmount > goal.remainingAmount) {
            errors.amount = t('goals.contribution.validation.maximum', {
                amount: formatGoalMoney(goal.remainingAmount, goal.currency, locale),
            })
        }
        if (!accountId) {
            errors.accountId = t('goals.contribution.validation.account')
        }
        if (note.length > 500) {
            errors.note = t('goals.contribution.validation.note')
        }

        setFieldErrors(errors)
        setFormError('')
        if (Object.keys(errors).length > 0) return

        setIsSaving(true)
        try {
            const result = await addGoalContribution(
                goal.id,
                {
                    accountId,
                    amount: numericAmount,
                    ...(note.trim() ? {note: note.trim()} : {}),
                },
                requestKeyRef.current,
            )
            onSaved(result)
        } catch (error) {
            if (error instanceof ApiError) {
                setFieldErrors(error.fieldErrors ?? {})
                setFormError(error.message)
            } else {
                setFormError(t('goals.contribution.error'))
            }
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="goal-modal-layer" role="presentation">
            <div
                ref={dialogRef}
                className="goal-modal goal-contribution-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="goal-contribution-title"
                tabIndex={-1}
            >
                <header className="goal-modal-heading">
                    <span className="goal-modal-mark" style={{color: goal.color}}>
                        <Icon name={goalIconName(goal.icon)}/>
                    </span>
                    <div>
                        <h2 id="goal-contribution-title">
                            {t('goals.contribution.title')}
                        </h2>
                        <p>{t('goals.contribution.subtitle', {name: goal.name})}</p>
                    </div>
                    <button
                        type="button"
                        aria-label={t('goals.contribution.close')}
                        disabled={isSaving}
                        onClick={onClose}
                    >
                        <Icon name="close"/>
                    </button>
                </header>

                <form onSubmit={(event) => void submit(event)} noValidate>
                    <section className="goal-contribution-summary">
                        <span><Icon name={goalIconName(goal.icon)}/></span>
                        <div>
                            <strong>{goal.name}</strong>
                            <small>
                                {t('goals.contribution.saved', {
                                    amount: formatGoalMoney(
                                        goal.savedAmount,
                                        goal.currency,
                                        locale,
                                    ),
                                })}
                            </small>
                        </div>
                        <b>
                            {t('goals.contribution.left', {
                                amount: formatGoalMoney(
                                    goal.remainingAmount,
                                    goal.currency,
                                    locale,
                                ),
                            })}
                        </b>
                    </section>

                    <div className="goal-field">
                        <label htmlFor="goal-contribution-amount">
                            {t('goals.contribution.amount')}
                        </label>
                        <input
                            ref={amountRef}
                            id="goal-contribution-amount"
                            type="number"
                            min="0.01"
                            max={goal.remainingAmount}
                            step="0.01"
                            value={amount}
                            placeholder="0"
                            aria-invalid={Boolean(fieldErrors.amount)}
                            onChange={(event) => {
                                setAmount(event.target.value)
                                setFieldErrors((current) => ({...current, amount: ''}))
                            }}
                        />
                        {fieldErrors.amount && <small>{fieldErrors.amount}</small>}
                    </div>

                    <div className="goal-field">
                        <label htmlFor="goal-contribution-account">
                            {t('goals.contribution.sourceAccount')}
                        </label>
                        <Select
                            id="goal-contribution-account"
                            aria-label={t('goals.contribution.accountLabel')}
                            value={accountId}
                            onValueChange={(value) => {
                                setAccountId(value)
                                setFieldErrors((current) => ({...current, accountId: ''}))
                            }}
                        >
                            <SelectOption value="">
                                {t('goals.contribution.chooseAccount')}
                            </SelectOption>
                            {eligibleAccounts.map((account) => (
                                <SelectOption value={account.id} key={account.id}>
                                    {account.name} · {formatGoalMoney(
                                        account.balance,
                                        account.currency,
                                        locale,
                                    )}
                                </SelectOption>
                            ))}
                        </Select>
                        {fieldErrors.accountId && <small>{fieldErrors.accountId}</small>}
                        {eligibleAccounts.length === 0 && (
                            <p className="goal-field-hint">
                                {t('goals.contribution.noAccount', {
                                    currency: goal.currency,
                                })}
                            </p>
                        )}
                    </div>

                    <div className="goal-field">
                        <label htmlFor="goal-contribution-note">
                            {t('goals.contribution.note')}{' '}
                            <span>{t('goals.contribution.optional')}</span>
                        </label>
                        <textarea
                            id="goal-contribution-note"
                            value={note}
                            maxLength={500}
                            placeholder={t('goals.contribution.notePlaceholder')}
                            aria-invalid={Boolean(fieldErrors.note)}
                            onChange={(event) => setNote(event.target.value)}
                        />
                        {fieldErrors.note && <small>{fieldErrors.note}</small>}
                    </div>

                    <div className="goal-money-notice">
                        <Icon name="transfer"/>
                        <p>
                            <strong>{t('goals.contribution.moneyTitle')}</strong>
                            <span>{t('goals.contribution.moneyDescription')}</span>
                        </p>
                    </div>

                    {formError && <p className="goal-form-error" role="alert"><Icon name="alert"/>{formError}</p>}

                    <footer className="goal-modal-actions compact">
                        <button type="button" disabled={isSaving} onClick={onClose}>
                            {t('goals.contribution.cancel')}
                        </button>
                        <button className="primary" type="submit" disabled={isSaving || eligibleAccounts.length === 0}>
                            {isSaving
                                ? t('goals.contribution.adding')
                                : t('goals.contribution.add')}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    )
}
