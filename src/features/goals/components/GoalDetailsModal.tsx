import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import {Icon} from '../../../components/Icons'
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
    paceLabels,
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

const displayContributionDate = (value: string): string =>
    new Intl.DateTimeFormat('en-US', {
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
            setActionError(errorMessage(error, 'We could not update this goal.'))
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
            setActionError(errorMessage(error, 'We could not return this contribution.'))
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
            setActionError(errorMessage(error, 'We could not cancel this goal.'))
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
                        <p>Target · {formatGoalMonth(currentGoal.targetMonth)}</p>
                    </div>
                    <button ref={closeRef} type="button" aria-label="Close goal details" onClick={onClose}>
                        <Icon name="close"/>
                    </button>
                </header>

                <div className="goal-details-body">
                    <section className="goal-details-overview">
                        <div className="goal-details-total">
                            <span><small>Saved</small><strong>{formatGoalMoney(currentGoal.savedAmount, currentGoal.currency)}</strong></span>
                            <span><small>Target</small><strong>{formatGoalMoney(currentGoal.targetAmount, currentGoal.currency)}</strong></span>
                            <em className={`pace-${currentGoal.paceStatus.toLowerCase()}`}>{paceLabels[currentGoal.paceStatus]}</em>
                        </div>
                        <span className="goal-progress-track"><i style={{width: `${progress}%`, background: currentGoal.color}}/></span>
                        <div className="goal-details-plan">
                            <span><small>Monthly plan</small><strong>{formatGoalMoney(currentGoal.contributionPlan.monthlyAmount, currentGoal.currency)}</strong></span>
                            <span><small>Remaining</small><strong>{formatGoalMoney(currentGoal.remainingAmount, currentGoal.currency)}</strong></span>
                            <span><small>Projected finish</small><strong>{formatGoalMonth(currentGoal.projectedCompletionMonth)}</strong></span>
                        </div>
                    </section>

                    <div className="goal-details-actions">
                        {currentGoal.status === 'ACTIVE' && currentGoal.remainingAmount > 0 && (
                            <button className="primary" type="button" onClick={() => onAddProgress(currentGoal)}>
                                <Icon name="plus"/> Add progress
                            </button>
                        )}
                        {canModify && (
                            <button type="button" onClick={() => onEdit(currentGoal)}>
                                <Icon name="edit"/> Edit
                            </button>
                        )}
                        {canModify && (
                            <button type="button" disabled={isUpdatingStatus} onClick={() => void toggleStatus()}>
                                <Icon name={currentGoal.status === 'PAUSED' ? 'check-circle' : 'repeat'}/>
                                {isUpdatingStatus
                                    ? 'Updating…'
                                    : currentGoal.status === 'PAUSED' ? 'Resume' : 'Pause'}
                            </button>
                        )}
                    </div>

                    {actionError && <p className="goal-form-error" role="alert"><Icon name="alert"/>{actionError}</p>}

                    <section className="goal-history">
                        <header>
                            <div><h3>Contribution history</h3><p>Money moved between accounts and this goal.</p></div>
                            {historyState === 'error' && <button type="button" onClick={() => loadHistory()}>Try again</button>}
                        </header>

                        {historyState === 'loading' && <div className="goal-history-loading" aria-label="Loading contribution history"><span/><span/><span/></div>}
                        {historyState === 'error' && <p className="goal-history-empty">Contribution history is unavailable.</p>}
                        {historyState === 'ready' && contributions.length === 0 && (
                            <p className="goal-history-empty">No contributions yet.</p>
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
                                                <strong>{item.type === 'CONTRIBUTION' ? 'Contribution' : 'Returned to account'}</strong>
                                                <small>{accountNames.get(item.accountId) ?? 'Account'} · {displayContributionDate(item.contributedAt)}</small>
                                                {item.note && <p>{item.note}</p>}
                                            </div>
                                            <b className={item.type.toLowerCase()}>{item.type === 'CONTRIBUTION' ? '+' : '−'}{formatGoalMoney(item.amount, item.currency)}</b>
                                            {item.type === 'CONTRIBUTION' && (
                                                <button
                                                    type="button"
                                                    disabled={wasReturned || refundingId === item.id}
                                                    onClick={() => void refund(item.id)}
                                                >
                                                    {refundingId === item.id ? 'Returning…' : wasReturned ? 'Returned' : 'Return'}
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
                                    <div><strong>Cancel goal</strong><p>{currentGoal.savedAmount > 0
                                        ? 'Return every contribution before cancelling so the money is not left reserved.'
                                        : 'This removes the goal from your active plans.'}</p></div>
                                    <button
                                        type="button"
                                        disabled={currentGoal.savedAmount > 0}
                                        onClick={() => setIsConfirmingCancel(true)}
                                    >Cancel goal</button>
                                </>
                            ) : (
                                <div className="goal-cancel-confirm">
                                    <p><strong>Cancel {currentGoal.name}?</strong><span>This cannot currently be restored.</span></p>
                                    <button type="button" disabled={isCancelling} onClick={() => setIsConfirmingCancel(false)}>Keep goal</button>
                                    <button className="danger" type="button" disabled={isCancelling} onClick={() => void cancel()}>{isCancelling ? 'Cancelling…' : 'Yes, cancel'}</button>
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </div>
        </div>
    )
}
