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
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import {Select, SelectOption} from '../../../components/Select'
import {useLanguage} from '../../../i18n/useLanguage'
import type {Account} from '../../accounts/api/accountsApi'
import {currencies} from '../../../shared/currency'
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
    const {t} = useTranslation()
    const {locale} = useLanguage()
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

        if (!name.trim()) {
            errors.name = t('goals.form.validation.name')
        }
        if (name.trim().length > 100) {
            errors.name = t('goals.form.validation.nameLength')
        }
        if (!Number.isFinite(numericTarget) || numericTarget <= 0) {
            errors.targetAmount = t('goals.form.validation.targetAmount')
        }
        if (!targetMonth || targetMonth < currentMonth()) {
            errors.targetMonth = t('goals.form.validation.targetMonth')
        }
        if (!isEditing && (!Number.isFinite(numericInitial) || numericInitial < 0)) {
            errors.initialAmount = t('goals.form.validation.initialAmount')
        }
        if (!isEditing && numericInitial > numericTarget) {
            errors.initialAmount = t('goals.form.validation.initialMaximum')
        }
        if (!isEditing && numericInitial > 0 && !accountId) {
            errors.accountId = t('goals.form.validation.account')
        }
        if (planType === 'CUSTOM' && (!Number.isFinite(numericCustom) || numericCustom <= 0)) {
            errors.customMonthlyAmount = t('goals.form.validation.customAmount')
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
                                note: t('goals.form.initialNote'),
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
                        ? t('goals.form.updateError')
                        : t('goals.form.createError'),
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
                        <h2 id="goal-form-title">
                            {isEditing
                                ? t('goals.form.editTitle')
                                : t('goals.form.createTitle')}
                        </h2>
                        <p>{isEditing
                            ? t('goals.form.editSubtitle')
                            : t('goals.form.createSubtitle')}</p>
                    </div>
                    <button
                        type="button"
                        aria-label={t('goals.form.close')}
                        disabled={isSaving}
                        onClick={onClose}
                    >
                        <Icon name="close"/>
                    </button>
                </header>

                <form onSubmit={(event) => void submit(event)} noValidate>
                    <div className="goal-form-fields">
                        <section>
                            <h3>{t('goals.form.details')}</h3>
                            <div className="goal-field goal-field-wide">
                                <label htmlFor="goal-name">{t('goals.form.name')}</label>
                                <input
                                    ref={nameRef}
                                    id="goal-name"
                                    value={name}
                                    maxLength={100}
                                    placeholder={t('goals.form.namePlaceholder')}
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
                                    <label htmlFor="goal-target-amount">
                                        {t('goals.form.targetAmount')}
                                    </label>
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
                                    <label htmlFor="goal-currency">
                                        {t('goals.form.currency')}
                                    </label>
                                    <Select
                                        id="goal-currency"
                                        aria-label={t('goals.form.currencyLabel')}
                                        value={currency}
                                        disabled={isEditing}
                                        onValueChange={(value) => {
                                            setCurrency(value as Currency)
                                            setAccountId('')
                                        }}
                                    >
                                        {currencies.map((item) => (
                                            <SelectOption value={item} key={item}>
                                                {item} · {t(`currencies.${item}`)}
                                            </SelectOption>
                                        ))}
                                    </Select>
                                </div>
                            </div>

                            <div className="goal-field-row">
                                {!isEditing && (
                                    <div className="goal-field">
                                        <label htmlFor="goal-initial-amount">
                                            {t('goals.form.initialContribution')}
                                        </label>
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
                                    <label htmlFor="goal-target-month">
                                        {t('goals.form.targetMonth')}
                                    </label>
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
                                    <label htmlFor="goal-source-account">
                                        {t('goals.form.sourceAccount')}
                                    </label>
                                    <Select
                                        id="goal-source-account"
                                        aria-label={t('goals.form.accountLabel')}
                                        value={accountId}
                                        onValueChange={setAccountId}
                                    >
                                        <SelectOption value="">
                                            {t('goals.form.chooseAccount')}
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
                                            {t('goals.form.noAccount', {currency})}
                                        </p>
                                    )}
                                </div>
                            )}

                            <h3 className="goal-section-heading">
                                {t('goals.form.contributionPlan')}
                            </h3>
                            <p className="goal-section-copy">
                                {t('goals.form.planDescription')}
                            </p>
                            <div className="goal-plan-options">
                                <label className={planType === 'RECOMMENDED' ? 'selected' : undefined}>
                                    <input
                                        type="radio"
                                        name="goal-plan"
                                        checked={planType === 'RECOMMENDED'}
                                        onChange={() => setPlanType('RECOMMENDED')}
                                    />
                                    <span>
                                        <b>{t('goals.form.recommended')}</b>
                                        <strong>{visiblePreview
                                            ? t('goals.form.perMonth', {
                                                amount: formatGoalMoney(
                                                    visiblePreview.recommendedMonthlyAmount,
                                                    currency,
                                                    locale,
                                                ),
                                            })
                                            : t('goals.form.calculatedAutomatically')}</strong>
                                    </span>
                                </label>
                                <label className={planType === 'CUSTOM' ? 'selected' : undefined}>
                                    <input
                                        type="radio"
                                        name="goal-plan"
                                        checked={planType === 'CUSTOM'}
                                        onChange={() => setPlanType('CUSTOM')}
                                    />
                                    <span>
                                        <b>{t('goals.form.customAmount')}</b>
                                        <small>{t('goals.form.customDescription')}</small>
                                    </span>
                                </label>
                            </div>

                            {planType === 'CUSTOM' && (
                                <div className="goal-field goal-field-wide goal-custom-amount">
                                    <label htmlFor="goal-custom-amount">
                                        {t('goals.form.monthlyAmount')}
                                    </label>
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

                            <h3 className="goal-section-heading">
                                {t('goals.form.appearance')}
                            </h3>
                            <div className="goal-appearance-row">
                                <fieldset>
                                    <legend>{t('goals.form.icon')}</legend>
                                    <div className="goal-icon-options">
                                        {goalIcons.map((item) => (
                                            <label className={goalIconName(icon) === item ? 'selected' : undefined} key={item}>
                                                <input
                                                    type="radio"
                                                    name="goal-icon"
                                                    value={item}
                                                    aria-label={`${t('goals.form.icon')}: ${item}`}
                                                    checked={goalIconName(icon) === item}
                                                    onChange={() => setIcon(item)}
                                                />
                                                <Icon name={item}/>
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                                <fieldset>
                                    <legend>{t('goals.form.color')}</legend>
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
                                                    aria-label={t(`goals.form.colors.${item.name}`)}
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

                        <aside
                            className="goal-live-preview"
                            aria-label={t('goals.form.previewLabel')}
                        >
                            <p>{t('goals.form.livePreview')}</p>
                            <article className="goal-preview-card">
                                <header>
                                    <span><Icon name={goalIconName(icon)}/></span>
                                    <div>
                                        <strong>
                                            {name.trim() || t('goals.form.newGoal')}
                                        </strong>
                                        <small>
                                            {t('goals.form.targetDate', {
                                                date: formatGoalMonth(
                                                    targetMonth,
                                                    locale,
                                                    t('goals.summary.noTarget'),
                                                ),
                                            })}
                                        </small>
                                    </div>
                                    <em className={`pace-${previewPace.toLowerCase()}`}>
                                        {t(`goals.pace.${previewPace}`)}
                                    </em>
                                </header>
                                <div className="goal-preview-amount">
                                    <strong>{formatGoalMoney(
                                        numericInitial || 0,
                                        currency,
                                        locale,
                                    )}</strong>
                                    <span>
                                        {t('goals.form.ofAmount', {
                                            amount: formatGoalMoney(
                                                numericTarget || 0,
                                                currency,
                                                locale,
                                            ),
                                        })}
                                    </span>
                                    <b>{Math.round(previewProgress)}%</b>
                                </div>
                                <span className="goal-progress-track"><i style={{width: `${Math.min(previewProgress, 100)}%`}}/></span>
                                <footer>
                                    <span>
                                        <small>{t('goals.form.monthlyContribution')}</small>
                                        <strong>{formatGoalMoney(
                                            previewAmount,
                                            currency,
                                            locale,
                                        )}</strong>
                                    </span>
                                    <span>
                                        <small>{t('goals.form.remaining')}</small>
                                        <strong>{formatGoalMoney(
                                            previewRemaining,
                                            currency,
                                            locale,
                                        )}</strong>
                                    </span>
                                </footer>
                            </article>

                            <h3>{t('goals.form.calculatedPlan')}</h3>
                            <section className="goal-calculated-plan">
                                <small>{t('goals.form.targetGap')}</small>
                                <strong>{formatGoalMoney(
                                    previewRemaining,
                                    currency,
                                    locale,
                                )}</strong>
                                <div>
                                    <span>
                                        {formatGoalMonth(currentMonth(), locale)}
                                        {' → '}
                                        {formatGoalMonth(targetMonth, locale)}
                                    </span>
                                    <b>{t('goals.form.perMonthShort', {
                                        amount: formatGoalMoney(
                                            previewAmount,
                                            currency,
                                            locale,
                                        ),
                                    })}</b>
                                </div>
                            </section>

                            <div className="goal-plan-notice">
                                <Icon name="alert"/>
                                <span>{isEditing
                                    ? t('goals.form.editMoneyNotice')
                                    : numericInitial > 0
                                        ? t('goals.form.initialMoneyNotice')
                                        : t('goals.form.noInitialMoneyNotice')}</span>
                            </div>

                            {canPreview && previewState === 'loading' && (
                                <p className="goal-preview-status">
                                    {t('goals.form.calculating')}
                                </p>
                            )}
                            {canPreview && previewState === 'error' && (
                                <p className="goal-preview-status error">
                                    {t('goals.form.previewUnavailable')}
                                </p>
                            )}
                        </aside>
                    </div>

                    {formError && <p className="goal-form-error" role="alert"><Icon name="alert"/>{formError}</p>}

                    <footer className="goal-modal-actions">
                        <span>{t('goals.form.footer')}</span>
                        <button type="button" disabled={isSaving} onClick={onClose}>
                            {t('goals.form.cancel')}
                        </button>
                        <button className="primary" type="submit" disabled={isSaving}>
                            {isSaving
                                ? t('goals.form.saving')
                                : isEditing
                                    ? t('goals.form.save')
                                    : t('goals.form.create')}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    )
}
