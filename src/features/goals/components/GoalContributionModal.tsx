import {
    useMemo,
    useRef,
    useState,
} from 'react'
import type {FormEvent} from 'react'
import {Icon} from '../../../components/Icons'
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
            errors.amount = 'Enter an amount greater than zero.'
        } else if (numericAmount > goal.remainingAmount) {
            errors.amount = `The maximum needed is ${formatGoalMoney(goal.remainingAmount, goal.currency)}.`
        }
        if (!accountId) errors.accountId = 'Choose a source account.'
        if (note.length > 500) errors.note = 'Use no more than 500 characters.'

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
                setFormError('We could not add this contribution. Please try again.')
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
                        <h2 id="goal-contribution-title">Add progress</h2>
                        <p>Move money from an account into {goal.name}.</p>
                    </div>
                    <button type="button" aria-label="Close contribution form" disabled={isSaving} onClick={onClose}>
                        <Icon name="close"/>
                    </button>
                </header>

                <form onSubmit={(event) => void submit(event)} noValidate>
                    <section className="goal-contribution-summary">
                        <span><Icon name={goalIconName(goal.icon)}/></span>
                        <div><strong>{goal.name}</strong><small>{formatGoalMoney(goal.savedAmount, goal.currency)} saved</small></div>
                        <b>{formatGoalMoney(goal.remainingAmount, goal.currency)} left</b>
                    </section>

                    <div className="goal-field">
                        <label htmlFor="goal-contribution-amount">Contribution amount</label>
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
                        <label htmlFor="goal-contribution-account">Source account</label>
                        <Select
                            id="goal-contribution-account"
                            aria-label="Contribution account"
                            value={accountId}
                            onValueChange={(value) => {
                                setAccountId(value)
                                setFieldErrors((current) => ({...current, accountId: ''}))
                            }}
                        >
                            <SelectOption value="">Choose account</SelectOption>
                            {eligibleAccounts.map((account) => (
                                <SelectOption value={account.id} key={account.id}>
                                    {account.name} · {formatGoalMoney(account.balance, account.currency)}
                                </SelectOption>
                            ))}
                        </Select>
                        {fieldErrors.accountId && <small>{fieldErrors.accountId}</small>}
                        {eligibleAccounts.length === 0 && (
                            <p className="goal-field-hint">Create an active {goal.currency} account before adding progress.</p>
                        )}
                    </div>

                    <div className="goal-field">
                        <label htmlFor="goal-contribution-note">Note <span>Optional</span></label>
                        <textarea
                            id="goal-contribution-note"
                            value={note}
                            maxLength={500}
                            placeholder="What is this contribution for?"
                            aria-invalid={Boolean(fieldErrors.note)}
                            onChange={(event) => setNote(event.target.value)}
                        />
                        {fieldErrors.note && <small>{fieldErrors.note}</small>}
                    </div>

                    <div className="goal-money-notice">
                        <Icon name="transfer"/>
                        <p><strong>This moves real money in Certis.</strong><span>The selected account balance will decrease by the contribution amount.</span></p>
                    </div>

                    {formError && <p className="goal-form-error" role="alert"><Icon name="alert"/>{formError}</p>}

                    <footer className="goal-modal-actions compact">
                        <button type="button" disabled={isSaving} onClick={onClose}>Cancel</button>
                        <button className="primary" type="submit" disabled={isSaving || eligibleAccounts.length === 0}>
                            {isSaving ? 'Adding…' : 'Add contribution'}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    )
}
