import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import {useLanguage} from '../../../i18n/useLanguage'
import {ApiError} from '../../../shared/api/ApiError'
import {useModalAccessibility} from '../../../shared/hooks/useModalAccessibility'
import type {Account} from '../../accounts/api/accountsApi'
import {
    cancelGoal,
    getGoal,
    getGoalContributions,
    refundGoalContribution,
    updateGoal,
} from '../api/goalsApi'
import type {Goal, GoalContribution} from '../api/goalsApi'
import {
    formatGoalMoney,
    formatGoalMonth,
    goalIconName,
} from '../goalPresentation'
import './GoalModals.css'

type GoalDetailsModalProps = {
    goal: Goal
    accounts: Account[]
    onClose: () => void
    onEdit: (goal: Goal) => void
    onAddProgress: (goal: Goal) => void
    onChanged: (goal: Goal) => void
    onCancelled: (goalId: string) => void
    restoreFocus?: () => void
}

const displayContributionDate = (value: string, locale: string): string =>
    new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value))

const errorMessage = (error: unknown, fallback: string): string =>
    error instanceof ApiError ? error.message : fallback

export function GoalDetailsModal({
    goal,
    accounts,
    onClose,
    onEdit,
    onAddProgress,
    onChanged,
    onCancelled,
    restoreFocus,
}: GoalDetailsModalProps) {
    const {t} = useTranslation()
    const {locale} = useLanguage()
    const [currentGoal, setCurrentGoal] = useState(goal)
    const [contributions, setContributions] = useState<GoalContribution[]>([])
    const [historyState, setHistoryState] = useState<'loading' | 'ready' | 'error'>('loading')
    const [actionError, setActionError] = useState('')
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
    const [refundingId, setRefundingId] = useState<string | null>(null)
    const [isConfirmingCancel, setIsConfirmingCancel] = useState(false)
    const [isCancelling, setIsCancelling] = useState(false)
    const closeRef = useRef<HTMLButtonElement>(null)

    const dialogRef = useModalAccessibility<HTMLDivElement>({
        canClose: !isCancelling && !isUpdatingStatus && !refundingId,
        initialFocusRef: closeRef,
        onClose,
        restoreFocus,
    })

    const loadHistory = useCallback((signal?: AbortSignal) => {
        setHistoryState('loading')
        void getGoalContributions(currentGoal.id, {
            sort: 'CONTRIBUTED_AT_DESC',
            size: 100,
        }, signal).then((page) => {
            setContributions(page.items)
            setHistoryState('ready')
        }).catch((error: unknown) => {
            if (!(error instanceof Error && error.name === 'AbortError')) {
                setHistoryState('error')
            }
        })
    }, [currentGoal.id])

    useEffect(() => {
        void getGoalContributions(currentGoal.id, {
            sort: 'CONTRIBUTED_AT_DESC',
            size: 100,
        }).then((page) => {
            setContributions(page.items)
            setHistoryState('ready')
        }).catch((error: unknown) => {
            if (!(error instanceof Error && error.name === 'AbortError')) {
                setHistoryState('error')
            }
        })
    }, [currentGoal.id])

    const accountNames = useMemo(
        () => new Map(accounts.map((account) => [account.id, account.name])),
        [accounts],
    )
    const returnedContributionIds = useMemo(
        () => new Set(contributions
            .filter((item) => item.type === 'REFUND' && item.reversalOfContributionId)
            .map((item) => item.reversalOfContributionId as string)),
        [contributions],
    )

    const refreshGoal = async (): Promise<Goal> => {
        const refreshed = await getGoal(currentGoal.id)
        setCurrentGoal(refreshed)
        onChanged(refreshed)
        return refreshed
    }

    const toggleStatus = async () => {
        setActionError('')
        setIsUpdatingStatus(true)
        try {
            const updated = await updateGoal(currentGoal.id, {
                status: currentGoal.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED',
            })
            setCurrentGoal(updated)
            onChanged(updated)
        } catch (error) {
            setActionError(errorMessage(error, t('goals.details.updateError')))
        } finally {
            setIsUpdatingStatus(false)
        }
    }

    const refund = async (contributionId: string) => {
        setActionError('')
        setRefundingId(contributionId)
        try {
            await refundGoalContribution(currentGoal.id, contributionId)
            await refreshGoal()
            loadHistory()
        } catch (error) {
            setActionError(errorMessage(error, t('goals.details.refundError')))
        } finally {
            setRefundingId(null)
        }
    }

    const cancel = async () => {
        setActionError('')
        setIsCancelling(true)
        try {
            await cancelGoal(currentGoal.id)
            onCancelled(currentGoal.id)
        } catch (error) {
            setActionError(errorMessage(error, t('goals.details.cancelError')))
            setIsCancelling(false)
        }
    }

    const canModify = currentGoal.status === 'ACTIVE' || currentGoal.status === 'PAUSED'
    const progress = Math.min(currentGoal.progressPercentage, 100)

    return (
        <div className="goal-modal-layer" role="presentation">
            <div
                ref={dialogRef}
                className="goal-modal goal-details-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="goal-details-title"
                tabIndex={-1}
            >
                <header className="goal-modal-heading">
                    <span className="goal-modal-mark" style={{color: currentGoal.color}}>
                        <Icon name={goalIconName(currentGoal.icon)}/>
                    </span>
                    <div>
                        <h2 id="goal-details-title">{currentGoal.name}</h2>
                        <p>
                            {t('goals.details.targetDate', {
                                date: formatGoalMonth(
                                    currentGoal.targetMonth,
                                    locale,
                                    t('goals.summary.noTarget'),
                                ),
                            })}
                        </p>
                    </div>
                    <button
                        ref={closeRef}
                        type="button"
                        aria-label={t('goals.details.close')}
                        onClick={onClose}
                    >
                        <Icon name="close"/>
                    </button>
                </header>

                <div className="goal-details-body">
                    <section className="goal-details-overview">
                        <div className="goal-details-total">
                            <span>
                                <small>{t('goals.details.saved')}</small>
                                <strong>{formatGoalMoney(
                                    currentGoal.savedAmount,
                                    currentGoal.currency,
                                    locale,
                                )}</strong>
                            </span>
                            <span>
                                <small>{t('goals.details.target')}</small>
                                <strong>{formatGoalMoney(
                                    currentGoal.targetAmount,
                                    currentGoal.currency,
                                    locale,
                                )}</strong>
                            </span>
                            <em className={`pace-${currentGoal.paceStatus.toLowerCase()}`}>
                                {t(`goals.pace.${currentGoal.paceStatus}`)}
                            </em>
                        </div>
                        <span className="goal-progress-track"><i style={{width: `${progress}%`, background: currentGoal.color}}/></span>
                        <div className="goal-details-plan">
                            <span>
                                <small>{t('goals.details.monthlyPlan')}</small>
                                <strong>{formatGoalMoney(
                                    currentGoal.contributionPlan.monthlyAmount,
                                    currentGoal.currency,
                                    locale,
                                )}</strong>
                            </span>
                            <span>
                                <small>{t('goals.details.remaining')}</small>
                                <strong>{formatGoalMoney(
                                    currentGoal.remainingAmount,
                                    currentGoal.currency,
                                    locale,
                                )}</strong>
                            </span>
                            <span>
                                <small>{t('goals.details.projectedFinish')}</small>
                                <strong>{formatGoalMonth(
                                    currentGoal.projectedCompletionMonth,
                                    locale,
                                    t('goals.summary.noTarget'),
                                )}</strong>
                            </span>
                        </div>
                    </section>

                    <div className="goal-details-actions">
                        {currentGoal.status === 'ACTIVE' && currentGoal.remainingAmount > 0 && (
                            <button className="primary" type="button" onClick={() => onAddProgress(currentGoal)}>
                                <Icon name="plus"/> {t('goals.details.addProgress')}
                            </button>
                        )}
                        {canModify && (
                            <button type="button" onClick={() => onEdit(currentGoal)}>
                                <Icon name="edit"/> {t('goals.details.edit')}
                            </button>
                        )}
                        {canModify && (
                            <button type="button" disabled={isUpdatingStatus} onClick={() => void toggleStatus()}>
                                <Icon name={currentGoal.status === 'PAUSED' ? 'check-circle' : 'repeat'}/>
                                {isUpdatingStatus
                                    ? t('goals.details.updating')
                                    : currentGoal.status === 'PAUSED'
                                        ? t('goals.details.resume')
                                        : t('goals.details.pause')}
                            </button>
                        )}
                    </div>

                    {actionError && <p className="goal-form-error" role="alert"><Icon name="alert"/>{actionError}</p>}

                    <section className="goal-history">
                        <header>
                            <div>
                                <h3>{t('goals.details.historyTitle')}</h3>
                                <p>{t('goals.details.historySubtitle')}</p>
                            </div>
                            {historyState === 'error' && (
                                <button type="button" onClick={() => loadHistory()}>
                                    {t('goals.details.tryAgain')}
                                </button>
                            )}
                        </header>

                        {historyState === 'loading' && (
                            <div
                                className="goal-history-loading"
                                aria-label={t('goals.details.loadingHistory')}
                            >
                                <span/><span/><span/>
                            </div>
                        )}
                        {historyState === 'error' && (
                            <p className="goal-history-empty">
                                {t('goals.details.historyUnavailable')}
                            </p>
                        )}
                        {historyState === 'ready' && contributions.length === 0 && (
                            <p className="goal-history-empty">
                                {t('goals.details.historyEmpty')}
                            </p>
                        )}
                        {historyState === 'ready' && contributions.length > 0 && (
                            <div className="goal-history-list">
                                {contributions.map((item) => {
                                    const wasReturned = returnedContributionIds.has(item.id)
                                    return (
                                        <article key={item.id}>
                                            <span className={item.type.toLowerCase()}>
                                                <Icon name={item.type === 'CONTRIBUTION' ? 'arrow-down-left' : 'arrow-up-right'}/>
                                            </span>
                                            <div>
                                                <strong>
                                                    {item.type === 'CONTRIBUTION'
                                                        ? t('goals.details.contribution')
                                                        : t('goals.details.returnedToAccount')}
                                                </strong>
                                                <small>
                                                    {accountNames.get(item.accountId)
                                                        ?? t('goals.details.account')}
                                                    {' · '}
                                                    {displayContributionDate(
                                                        item.contributedAt,
                                                        locale,
                                                    )}
                                                </small>
                                                {item.note && <p>{item.note}</p>}
                                            </div>
                                            <b className={item.type.toLowerCase()}>
                                                {item.type === 'CONTRIBUTION' ? '+' : '−'}
                                                {formatGoalMoney(
                                                    item.amount,
                                                    item.currency,
                                                    locale,
                                                )}
                                            </b>
                                            {item.type === 'CONTRIBUTION' && (
                                                <button
                                                    type="button"
                                                    disabled={wasReturned || refundingId === item.id}
                                                    onClick={() => void refund(item.id)}
                                                >
                                                    {refundingId === item.id
                                                        ? t('goals.details.returning')
                                                        : wasReturned
                                                            ? t('goals.details.returned')
                                                            : t('goals.details.return')}
                                                </button>
                                            )}
                                        </article>
                                    )
                                })}
                            </div>
                        )}
                    </section>

                    {canModify && (
                        <section className="goal-cancel-section">
                            {!isConfirmingCancel ? (
                                <>
                                    <div>
                                        <strong>{t('goals.details.cancelTitle')}</strong>
                                        <p>
                                            {currentGoal.savedAmount > 0
                                                ? t('goals.details.cancelWithSavings')
                                                : t('goals.details.cancelWithoutSavings')}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={currentGoal.savedAmount > 0}
                                        onClick={() => setIsConfirmingCancel(true)}
                                    >{t('goals.details.cancelTitle')}</button>
                                </>
                            ) : (
                                <div className="goal-cancel-confirm">
                                    <p>
                                        <strong>{t('goals.details.confirmTitle', {
                                            name: currentGoal.name,
                                        })}</strong>
                                        <span>{t('goals.details.irreversible')}</span>
                                    </p>
                                    <button
                                        type="button"
                                        disabled={isCancelling}
                                        onClick={() => setIsConfirmingCancel(false)}
                                    >
                                        {t('goals.details.keep')}
                                    </button>
                                    <button
                                        className="danger"
                                        type="button"
                                        disabled={isCancelling}
                                        onClick={() => void cancel()}
                                    >
                                        {isCancelling
                                            ? t('goals.details.cancelling')
                                            : t('goals.details.confirm')}
                                    </button>
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </div>
        </div>
    )
}
