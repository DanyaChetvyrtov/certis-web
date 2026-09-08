import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import type {
    CSSProperties,
    FormEvent,
} from 'react'
import {Icon} from '../../../components/Icons'
import {Select, SelectOption} from '../../../components/Select'
import type {Account} from '../../accounts/api/accountsApi'
import {currencies, currencyLabels} from '../../../shared/currency'
import type {Currency} from '../../../shared/currency'
import {ApiError} from '../../../shared/api/ApiError'
import {useModalAccessibility} from '../../../shared/hooks/useModalAccessibility'
import {
    createGoal,
    previewGoalPlan,
    updateGoal,
} from '../api/goalsApi'
import type {
    Goal,
    GoalPlanPreview,
    GoalPlanType,
} from '../api/goalsApi'
import {
    addMonths,
    currentMonth,
    formatGoalMoney,
    formatGoalMonth,
    goalColors,
    goalIconName,
    goalIcons,
    paceLabels,
} from '../goalPresentation'
import './GoalModals.css'

type GoalFormModalProps = {
    accounts: Account[]
    defaultCurrency: Currency
    goal?: Goal
    onClose: () => void
    onSaved: (goal: Goal) => void
    restoreFocus?: () => void
}

type GoalAccentStyle = CSSProperties & {
    '--goal-accent': string
}

const accentStyle = (color: string): GoalAccentStyle => ({
    '--goal-accent': color,
})

const toAmount = (value: string): number => Number(value.replace(',', '.'))

export function GoalFormModal({
    accounts,
    defaultCurrency,
    goal,
    onClose,
    onSaved,
    restoreFocus,
}: GoalFormModalProps) {
    const isEditing = Boolean(goal)
    const [name, setName] = useState(goal?.name ?? '')
    const [targetAmount, setTargetAmount] = useState(
        goal ? String(goal.targetAmount) : '',
    )
    const [currency, setCurrency] = useState<Currency>(
        goal?.currency ?? defaultCurrency,
    )
    const [targetMonth, setTargetMonth] = useState(
        goal?.targetMonth ?? addMonths(currentMonth(), 12),
    )
    const [initialAmount, setInitialAmount] = useState(
        goal ? String(goal.savedAmount) : '0',
    )
    const [accountId, setAccountId] = useState('')
    const [planType, setPlanType] = useState<GoalPlanType>(
        goal?.contributionPlan.type ?? 'RECOMMENDED',
    )
    const [customMonthlyAmount, setCustomMonthlyAmount] = useState(
        goal?.contributionPlan.type === 'CUSTOM'
            ? String(goal.contributionPlan.monthlyAmount)
            : '',
    )
    const [icon, setIcon] = useState(goal?.icon ?? 'target')
    const [color, setColor] = useState(goal?.color ?? '#10B981')
    const [preview, setPreview] = useState<GoalPlanPreview | null>(null)
    const [previewState, setPreviewState] = useState<
        'idle' | 'loading' | 'ready' | 'error'
    >('idle')
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [formError, setFormError] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const nameRef = useRef<HTMLInputElement>(null)

    const dialogRef = useModalAccessibility<HTMLDivElement>({
        canClose: !isSaving,
        initialFocusRef: nameRef,
        onClose,
        restoreFocus,
    })

    const eligibleAccounts = useMemo(
        () => accounts.filter((account) => (
            account.currency === currency && !account.closedAt
        )),
        [accounts, currency],
    )

    const numericTarget = toAmount(targetAmount)
    const numericInitial = isEditing
        ? goal?.savedAmount ?? 0
        : toAmount(initialAmount)
    const numericCustom = toAmount(customMonthlyAmount)
    const canPreview = Number.isFinite(numericTarget)
        && numericTarget > 0
        && Number.isFinite(numericInitial)
        && numericInitial >= 0
        && numericInitial <= numericTarget
        && targetMonth >= currentMonth()
        && (planType === 'RECOMMENDED'
            || (Number.isFinite(numericCustom) && numericCustom > 0))

    useEffect(() => {
        if (!canPreview) {
            return
        }

        let cancelled = false
        const timeout = window.setTimeout(() => {
            setPreviewState('loading')
            void previewGoalPlan({
                targetAmount: numericTarget,
                initialAmount: numericInitial,
                currency,
                targetMonth,
                contributionPlan: {
                    type: planType,
                    ...(planType === 'CUSTOM'
                        ? {monthlyAmount: numericCustom}
                        : {}),
                },
            }).then((result) => {
                if (!cancelled) {
                    setPreview(result)
                    setPreviewState('ready')
                }
            }).catch((error: unknown) => {
                if (!cancelled && !(error instanceof Error && error.name === 'AbortError')) {
                    setPreview(null)
                    setPreviewState('error')
                }
            })
        }, 250)

        return () => {
            cancelled = true
            window.clearTimeout(timeout)
        }
    }, [
        canPreview,
        currency,
        numericCustom,
        numericInitial,
        numericTarget,
        planType,
        targetMonth,
    ])

    const validate = (): boolean => {
        const errors: Record<string, string> = {}

        if (!name.trim()) errors.name = 'Enter a goal name.'
        if (name.trim().length > 100) errors.name = 'Use no more than 100 characters.'
        if (!Number.isFinite(numericTarget) || numericTarget <= 0) {
            errors.targetAmount = 'Enter an amount greater than zero.'
        }
        if (!targetMonth || targetMonth < currentMonth()) {
            errors.targetMonth = 'Choose the current month or a later month.'
        }
        if (!isEditing && (!Number.isFinite(numericInitial) || numericInitial < 0)) {
            errors.initialAmount = 'Enter zero or a positive amount.'
        }
        if (!isEditing && numericInitial > numericTarget) {
            errors.initialAmount = 'Initial contribution cannot exceed the target.'
        }
        if (!isEditing && numericInitial > 0 && !accountId) {
            errors.accountId = 'Choose the account that will fund this contribution.'
        }
        if (planType === 'CUSTOM' && (!Number.isFinite(numericCustom) || numericCustom <= 0)) {
            errors.customMonthlyAmount = 'Enter a monthly amount greater than zero.'
        }

        setFieldErrors(errors)
        return Object.keys(errors).length === 0
    }

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setFormError('')

        if (!validate()) return

        setIsSaving(true)

        const contributionPlan = {
            type: planType,
            ...(planType === 'CUSTOM'
                ? {monthlyAmount: numericCustom}
                : {}),
        }

        try {
            const savedGoal = goal
                ? await updateGoal(goal.id, {
                    name: name.trim(),
                    targetAmount: numericTarget,
                    targetMonth,
                    contributionPlan,
                    icon,
                    color,
                })
                : await createGoal({
                    name: name.trim(),
                    targetAmount: numericTarget,
                    currency,
                    targetMonth,
                    contributionPlan,
                    ...(numericInitial > 0
                        ? {
                            initialContribution: {
                                accountId,
                                amount: numericInitial,
                                note: 'Initial goal contribution',
                            },
                        }
                        : {}),
                    icon,
                    color,
                })

            onSaved(savedGoal)
        } catch (error) {
            if (error instanceof ApiError) {
                setFieldErrors(error.fieldErrors ?? {})
                setFormError(error.message)
            } else {
                setFormError(
                    isEditing
                        ? 'We could not update this goal. Please try again.'
                        : 'We could not create this goal. Please try again.',
                )
            }
        } finally {
            setIsSaving(false)
        }
    }

    const visiblePreview = canPreview ? preview : null
    const previewAmount = visiblePreview?.selectedMonthlyAmount
        ?? goal?.contributionPlan.monthlyAmount
        ?? 0
    const previewRemaining = visiblePreview?.remainingAmount
        ?? Math.max(numericTarget - numericInitial, 0)
    const previewProgress = visiblePreview?.progressPercentage
        ?? (numericTarget > 0 ? numericInitial / numericTarget * 100 : 0)
    const previewPace = preview?.paceStatus ?? goal?.paceStatus ?? 'ON_TRACK'

    return (
        <div className="goal-modal-layer" role="presentation">
            <div
                ref={dialogRef}
                className="goal-modal goal-form-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="goal-form-title"
                tabIndex={-1}
                style={accentStyle(color)}
            >
                <header className="goal-modal-heading">
                    <span className="goal-modal-mark"><Icon name="target"/></span>
                    <div>
                        <h2 id="goal-form-title">{isEditing ? 'Edit goal' : 'Create a goal'}</h2>
                        <p>{isEditing
                            ? 'Update the target, contribution pace and appearance.'
                            : 'Define the target. Certis will calculate a realistic monthly pace.'}</p>
                    </div>
                    <button type="button" aria-label="Close goal form" disabled={isSaving} onClick={onClose}>
                        <Icon name="close"/>
                    </button>
                </header>

                <form onSubmit={(event) => void submit(event)} noValidate>
                    <div className="goal-form-fields">
                        <section>
                            <h3>Goal details</h3>
                            <div className="goal-field goal-field-wide">
                                <label htmlFor="goal-name">Goal name</label>
                                <input
                                    ref={nameRef}
                                    id="goal-name"
                                    value={name}
                                    maxLength={100}
                                    placeholder="e.g. Travel to Iceland"
                                    aria-invalid={Boolean(fieldErrors.name)}
                                    onChange={(event) => {
                                        setName(event.target.value)
                                        setFieldErrors((current) => ({...current, name: ''}))
                                    }}
                                />
                                {fieldErrors.name && <small>{fieldErrors.name}</small>}
                            </div>

                            <div className="goal-field-row">
                                <div className="goal-field">
                                    <label htmlFor="goal-target-amount">Target amount</label>
                                    <input
                                        id="goal-target-amount"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={targetAmount}
                                        placeholder="240000"
                                        aria-invalid={Boolean(fieldErrors.targetAmount)}
                                        onChange={(event) => setTargetAmount(event.target.value)}
                                    />
                                    {fieldErrors.targetAmount && <small>{fieldErrors.targetAmount}</small>}
                                </div>

                                <div className="goal-field">
                                    <label htmlFor="goal-currency">Currency</label>
                                    <Select
                                        id="goal-currency"
                                        aria-label="Goal currency"
                                        value={currency}
                                        disabled={isEditing}
                                        onValueChange={(value) => {
                                            setCurrency(value as Currency)
                                            setAccountId('')
                                        }}
                                    >
                                        {currencies.map((item) => (
                                            <SelectOption value={item} key={item}>
                                                {item} · {currencyLabels[item]}
                                            </SelectOption>
                                        ))}
                                    </Select>
                                </div>
                            </div>

                            <div className="goal-field-row">
                                {!isEditing && (
                                    <div className="goal-field">
                                        <label htmlFor="goal-initial-amount">Initial contribution</label>
                                        <input
                                            id="goal-initial-amount"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={initialAmount}
                                            aria-invalid={Boolean(fieldErrors.initialAmount)}
                                            onChange={(event) => setInitialAmount(event.target.value)}
                                        />
                                        {fieldErrors.initialAmount && <small>{fieldErrors.initialAmount}</small>}
                                    </div>
                                )}

                                <div className="goal-field">
                                    <label htmlFor="goal-target-month">Target month</label>
                                    <input
                                        id="goal-target-month"
                                        type="month"
                                        min={currentMonth()}
                                        value={targetMonth}
                                        aria-invalid={Boolean(fieldErrors.targetMonth)}
                                        onChange={(event) => setTargetMonth(event.target.value)}
                                    />
                                    {fieldErrors.targetMonth && <small>{fieldErrors.targetMonth}</small>}
                                </div>
                            </div>

                            {!isEditing && numericInitial > 0 && (
                                <div className="goal-field goal-field-wide">
                                    <label htmlFor="goal-source-account">Source account</label>
                                    <Select
                                        id="goal-source-account"
                                        aria-label="Initial contribution account"
                                        value={accountId}
                                        onValueChange={setAccountId}
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
                                        <p className="goal-field-hint">No active {currency} account is available.</p>
                                    )}
                                </div>
                            )}

                            <h3 className="goal-section-heading">Contribution plan</h3>
                            <p className="goal-section-copy">Use the calculated pace or enter your own monthly amount.</p>
                            <div className="goal-plan-options">
                                <label className={planType === 'RECOMMENDED' ? 'selected' : undefined}>
                                    <input
                                        type="radio"
                                        name="goal-plan"
                                        checked={planType === 'RECOMMENDED'}
                                        onChange={() => setPlanType('RECOMMENDED')}
                                    />
                                    <span><b>Recommended</b><strong>{visiblePreview
                                        ? `${formatGoalMoney(visiblePreview.recommendedMonthlyAmount, currency)} / month`
                                        : 'Calculated automatically'}</strong></span>
                                </label>
                                <label className={planType === 'CUSTOM' ? 'selected' : undefined}>
                                    <input
                                        type="radio"
                                        name="goal-plan"
                                        checked={planType === 'CUSTOM'}
                                        onChange={() => setPlanType('CUSTOM')}
                                    />
                                    <span><b>Custom amount</b><small>Set a different monthly pace</small></span>
                                </label>
                            </div>

                            {planType === 'CUSTOM' && (
                                <div className="goal-field goal-field-wide goal-custom-amount">
                                    <label htmlFor="goal-custom-amount">Monthly amount</label>
                                    <input
                                        id="goal-custom-amount"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={customMonthlyAmount}
                                        aria-invalid={Boolean(fieldErrors.customMonthlyAmount)}
                                        onChange={(event) => setCustomMonthlyAmount(event.target.value)}
                                    />
                                    {fieldErrors.customMonthlyAmount && <small>{fieldErrors.customMonthlyAmount}</small>}
                                </div>
                            )}

                            <h3 className="goal-section-heading">Appearance</h3>
                            <div className="goal-appearance-row">
                                <fieldset>
                                    <legend>Icon</legend>
                                    <div className="goal-icon-options">
                                        {goalIcons.map((item) => (
                                            <label className={goalIconName(icon) === item ? 'selected' : undefined} key={item}>
                                                <input
                                                    type="radio"
                                                    name="goal-icon"
                                                    value={item}
                                                    aria-label={`${item} icon`}
                                                    checked={goalIconName(icon) === item}
                                                    onChange={() => setIcon(item)}
                                                />
                                                <Icon name={item}/>
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                                <fieldset>
                                    <legend>Color</legend>
                                    <div className="goal-color-options">
                                        {goalColors.map((item) => (
                                            <label
                                                className={color.toUpperCase() === item.value.toUpperCase() ? 'selected' : undefined}
                                                style={accentStyle(item.value)}
                                                key={item.value}
                                            >
                                                <input
                                                    type="radio"
                                                    name="goal-color"
                                                    value={item.value}
                                                    aria-label={item.name}
                                                    checked={color.toUpperCase() === item.value.toUpperCase()}
                                                    onChange={() => setColor(item.value)}
                                                />
                                                <span/>
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                            </div>
                        </section>

                        <aside className="goal-live-preview" aria-label="Goal preview">
                            <p>Live preview</p>
                            <article className="goal-preview-card">
                                <header>
                                    <span><Icon name={goalIconName(icon)}/></span>
                                    <div><strong>{name.trim() || 'Your new goal'}</strong><small>Target · {formatGoalMonth(targetMonth)}</small></div>
                                    <em className={`pace-${previewPace.toLowerCase()}`}>{paceLabels[previewPace]}</em>
                                </header>
                                <div className="goal-preview-amount">
                                    <strong>{formatGoalMoney(numericInitial || 0, currency)}</strong>
                                    <span>of {formatGoalMoney(numericTarget || 0, currency)}</span>
                                    <b>{Math.round(previewProgress)}%</b>
                                </div>
                                <span className="goal-progress-track"><i style={{width: `${Math.min(previewProgress, 100)}%`}}/></span>
                                <footer>
                                    <span><small>Monthly contribution</small><strong>{formatGoalMoney(previewAmount, currency)}</strong></span>
                                    <span><small>Remaining</small><strong>{formatGoalMoney(previewRemaining, currency)}</strong></span>
                                </footer>
                            </article>

                            <h3>Calculated plan</h3>
                            <section className="goal-calculated-plan">
                                <small>Target gap</small>
                                <strong>{formatGoalMoney(previewRemaining, currency)}</strong>
                                <div><span>{formatGoalMonth(currentMonth())} → {formatGoalMonth(targetMonth)}</span><b>{formatGoalMoney(previewAmount, currency)}/mo</b></div>
                            </section>

                            <div className="goal-plan-notice">
                                <Icon name="alert"/>
                                <span>{isEditing
                                    ? 'Editing this plan does not move its existing savings.'
                                    : numericInitial > 0
                                        ? 'The initial contribution will be moved from the selected account.'
                                        : 'Creating a goal without an initial contribution does not move money.'}</span>
                            </div>

                            {canPreview && previewState === 'loading' && <p className="goal-preview-status">Calculating plan…</p>}
                            {canPreview && previewState === 'error' && <p className="goal-preview-status error">Plan preview is unavailable.</p>}
                        </aside>
                    </div>

                    {formError && <p className="goal-form-error" role="alert"><Icon name="alert"/>{formError}</p>}

                    <footer className="goal-modal-actions">
                        <span>You can edit the target, pace and appearance at any time.</span>
                        <button type="button" disabled={isSaving} onClick={onClose}>Cancel</button>
                        <button className="primary" type="submit" disabled={isSaving}>
                            {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Create goal'}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    )
}
