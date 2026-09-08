import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'
import type {CSSProperties} from 'react'
import {useSearchParams} from 'react-router-dom'
import {Icon} from '../../../components/Icons'
import {LoadingIndicator} from '../../../components/LoadingIndicator'
import {Select, SelectOption} from '../../../components/Select'
import {WorkspaceSidebar} from '../../../layouts/WorkspaceSidebar'
import {ApiError} from '../../../shared/api/ApiError'
import {currencies} from '../../../shared/currency'
import type {Currency} from '../../../shared/currency'
import {getAccounts} from '../../accounts/api/accountsApi'
import type {Account} from '../../accounts/api/accountsApi'
import {useSession} from '../../auth/session/SessionContext'
import {
    getGoal,
    getGoalOverview,
    getGoals,
    updateGoal,
} from '../api/goalsApi'
import type {
    Goal,
    GoalOverview,
    GoalPage,
    GoalSort,
} from '../api/goalsApi'
import {GoalContributionModal} from '../components/GoalContributionModal'
import {GoalDetailsModal} from '../components/GoalDetailsModal'
import {GoalFormModal} from '../components/GoalFormModal'
import {
    currentMonth,
    formatGoalMoney,
    formatGoalMonth,
    goalIconName,
    paceLabels,
} from '../goalPresentation'
import './GoalsPage.css'

type VisibleStatus = 'ACTIVE' | 'PAUSED' | 'ACHIEVED'

type GoalAccentStyle = CSSProperties & {
    '--goal-accent': string
}

const accentStyle = (color: string): GoalAccentStyle => ({
    '--goal-accent': color,
})

const sortLabels: Record<GoalSort, string> = {
    TARGET_MONTH_ASC: 'Nearest target',
    TARGET_MONTH_DESC: 'Furthest target',
    PROGRESS_ASC: 'Least progress',
    PROGRESS_DESC: 'Most progress',
    CREATED_AT_DESC: 'Newest first',
}

const errorMessage = (error: unknown, fallback: string): string =>
    error instanceof ApiError ? error.message : fallback

function GoalCard({
    goal,
    menuOpen,
    onOpenMenu,
    onDetails,
    onEdit,
    onContribution,
    onToggleStatus,
}: {
    goal: Goal
    menuOpen: boolean
    onOpenMenu: (trigger: HTMLButtonElement) => void
    onDetails: (trigger: HTMLElement) => void
    onEdit: (trigger: HTMLElement) => void
    onContribution: (trigger: HTMLElement) => void
    onToggleStatus: () => void
}) {
    const progress = Math.min(goal.progressPercentage, 100)
    const canContribute = goal.status === 'ACTIVE' && goal.remainingAmount > 0
    const canModify = goal.status === 'ACTIVE' || goal.status === 'PAUSED'

    return (
        <article className={`goal-card pace-${goal.paceStatus.toLowerCase()}`} style={accentStyle(goal.color)}>
            <header>
                <span className="goal-card-icon"><Icon name={goalIconName(goal.icon)}/></span>
                <div>
                    <button type="button" onClick={(event) => onDetails(event.currentTarget)}>{goal.name}</button>
                    <small>Target · {formatGoalMonth(goal.targetMonth)}</small>
                </div>
                <em>{paceLabels[goal.paceStatus]}</em>
            </header>

            <div className="goal-card-amount">
                <strong>{formatGoalMoney(goal.savedAmount, goal.currency)}</strong>
                <span>of {formatGoalMoney(goal.targetAmount, goal.currency)}</span>
                <b>{Math.round(goal.progressPercentage)}%</b>
            </div>
            <span className="goal-progress-track"><i style={{width: `${progress}%`}}/></span>

            <footer>
                <span><small>Monthly contribution</small><strong>{formatGoalMoney(goal.contributionPlan.monthlyAmount, goal.currency)}</strong></span>
                <div className="goal-card-actions">
                    {canContribute && (
                        <button type="button" className="goal-add-progress" onClick={(event) => onContribution(event.currentTarget)}>
                            <Icon name="plus"/> Add progress
                        </button>
                    )}
                    <div className="goal-card-menu-wrap">
                        <button
                            type="button"
                            className="goal-card-menu-trigger"
                            aria-label={`Actions for ${goal.name}`}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            onClick={(event) => onOpenMenu(event.currentTarget)}
                        >
                            <Icon name="more"/>
                        </button>
                        {menuOpen && (
                            <div className="goal-card-menu" role="menu">
                                <button type="button" role="menuitem" onClick={(event) => onDetails(event.currentTarget)}><Icon name="eye"/>View details</button>
                                {canModify && <button type="button" role="menuitem" onClick={(event) => onEdit(event.currentTarget)}><Icon name="edit"/>Edit goal</button>}
                                {canModify && (
                                    <button type="button" role="menuitem" onClick={onToggleStatus}>
                                        <Icon name={goal.status === 'PAUSED' ? 'check-circle' : 'repeat'}/>
                                        {goal.status === 'PAUSED' ? 'Resume goal' : 'Pause goal'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </footer>
        </article>
    )
}

export function GoalsPage() {
    const {profile} = useSession()
    const [searchParams] = useSearchParams()
    const defaultCurrency = profile?.preferredCurrency ?? 'RUB'
    const requestedCurrency = searchParams.get('currency')
    const initialCurrency = currencies.includes(requestedCurrency as Currency)
        ? requestedCurrency as Currency
        : defaultCurrency
    const [currency, setCurrency] = useState<Currency>(initialCurrency)
    const [status, setStatus] = useState<VisibleStatus>('ACTIVE')
    const [sort, setSort] = useState<GoalSort>('TARGET_MONTH_ASC')
    const [page, setPage] = useState(0)
    const [goalPage, setGoalPage] = useState<GoalPage | null>(null)
    const [overview, setOverview] = useState<GoalOverview | null>(null)
    const [accounts, setAccounts] = useState<Account[]>([])
    const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading')
    const [overviewState, setOverviewState] = useState<'loading' | 'ready' | 'error'>('loading')
    const [listError, setListError] = useState('')
    const [overviewError, setOverviewError] = useState('')
    const [notice, setNotice] = useState<{type: 'success' | 'error'; text: string} | null>(null)
    const [isCreateOpen, setCreateOpen] = useState(
        () => searchParams.get('create') === 'true',
    )
    const [contributionGoal, setContributionGoal] = useState<Goal | null>(null)
    const [detailsGoal, setDetailsGoal] = useState<Goal | null>(null)
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const newGoalButtonRef = useRef<HTMLButtonElement>(null)
    const dialogTriggerRef = useRef<HTMLElement | null>(null)

    const loadGoals = useCallback((signal?: AbortSignal) => {
        setListState('loading')
        setListError('')
        void getGoals({
            currency,
            status,
            sort,
            page,
            size: 20,
        }, signal).then((result) => {
            setGoalPage(result)
            setListState('ready')
        }).catch((error: unknown) => {
            if (!(error instanceof Error && error.name === 'AbortError')) {
                setListError(errorMessage(error, 'We could not load your goals.'))
                setListState('error')
            }
        })
    }, [currency, page, sort, status])

    const fetchGoals = useCallback(() => {
        void getGoals({
            currency,
            status,
            sort,
            page,
            size: 20,
        }).then((result) => {
            setGoalPage(result)
            setListState('ready')
        }).catch((error: unknown) => {
            if (!(error instanceof Error && error.name === 'AbortError')) {
                setListError(errorMessage(error, 'We could not load your goals.'))
                setListState('error')
            }
        })
    }, [currency, page, sort, status])

    const loadOverview = useCallback((signal?: AbortSignal) => {
        setOverviewState('loading')
        setOverviewError('')
        void getGoalOverview(currentMonth(), currency, signal).then((result) => {
            setOverview(result)
            setOverviewState('ready')
        }).catch((error: unknown) => {
            if (!(error instanceof Error && error.name === 'AbortError')) {
                setOverviewError(errorMessage(error, 'We could not load your goal overview.'))
                setOverviewState('error')
            }
        })
    }, [currency])

    const fetchOverview = useCallback(() => {
        void getGoalOverview(currentMonth(), currency).then((result) => {
            setOverview(result)
            setOverviewState('ready')
        }).catch((error: unknown) => {
            if (!(error instanceof Error && error.name === 'AbortError')) {
                setOverviewError(errorMessage(error, 'We could not load your goal overview.'))
                setOverviewState('error')
            }
        })
    }, [currency])

    useEffect(() => {
        fetchGoals()
    }, [fetchGoals])

    useEffect(() => {
        fetchOverview()
    }, [fetchOverview])

    useEffect(() => {
        void getAccounts().then(setAccounts).catch(() => setAccounts([]))
    }, [])

    useEffect(() => {
        if (!openMenuId) return

        const closeOnOutsideClick = (event: PointerEvent) => {
            const target = event.target
            if (!(target instanceof Element) || !target.closest('.goal-card-menu-wrap')) {
                setOpenMenuId(null)
            }
        }
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpenMenuId(null)
        }
        window.addEventListener('pointerdown', closeOnOutsideClick)
        window.addEventListener('keydown', closeOnEscape)
        return () => {
            window.removeEventListener('pointerdown', closeOnOutsideClick)
            window.removeEventListener('keydown', closeOnEscape)
        }
    }, [openMenuId])

    const refresh = () => {
        loadGoals()
        loadOverview()
    }

    const rememberTrigger = (trigger: HTMLElement) => {
        const stableMenuTrigger = trigger.closest('.goal-card-menu-wrap')
            ?.querySelector<HTMLElement>('.goal-card-menu-trigger')
        dialogTriggerRef.current = stableMenuTrigger ?? trigger
        setOpenMenuId(null)
    }

    const changeStatus = (nextStatus: VisibleStatus) => {
        setListState('loading')
        setStatus(nextStatus)
        setPage(0)
    }

    const showDetails = (goal: Goal, trigger: HTMLElement) => {
        rememberTrigger(trigger)
        setDetailsGoal(goal)
    }

    const showEdit = (goal: Goal, trigger: HTMLElement) => {
        rememberTrigger(trigger)
        setEditingGoal(goal)
    }

    const showContribution = (goal: Goal, trigger: HTMLElement) => {
        rememberTrigger(trigger)
        setContributionGoal(goal)
    }

    const toggleStatus = async (goal: Goal) => {
        setOpenMenuId(null)
        try {
            await updateGoal(goal.id, {
                status: goal.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED',
            })
            setNotice({
                type: 'success',
                text: goal.status === 'PAUSED' ? 'Goal resumed.' : 'Goal paused.',
            })
            refresh()
        } catch (error) {
            setNotice({type: 'error', text: errorMessage(error, 'We could not update this goal.')})
        }
    }

    const reviewRecommendation = async (trigger: HTMLElement) => {
        if (!overview?.recommendation) return
        rememberTrigger(trigger)
        const localGoal = goalPage?.items.find((item) => item.id === overview.recommendation?.goalId)

        if (localGoal) {
            setEditingGoal(localGoal)
            return
        }

        try {
            setEditingGoal(await getGoal(overview.recommendation.goalId))
        } catch (error) {
            setNotice({type: 'error', text: errorMessage(error, 'We could not load this goal.')})
        }
    }

    const activeAccounts = accounts.filter((account) => !account.closedAt).length
    const summary = overview?.summary
    const nearest = overview?.nearestTarget
    const thisMonth = overview?.currentMonth

    return (
        <div className="goals-workspace">
            <WorkspaceSidebar activePage="goals" activeAccounts={activeAccounts}/>

            <main className="goals-main">
                <header className="goals-header">
                    <div><h1>Goals</h1><p>Turn long-term plans into measurable progress.</p></div>
                    <div className="goals-header-actions">
                        <label className="goals-currency-action">
                            <span>Currency</span>
                            <Select
                                aria-label="Goals currency"
                                value={currency}
                                onValueChange={(value) => {
                                    setListState('loading')
                                    setOverviewState('loading')
                                    setCurrency(value as Currency)
                                    setPage(0)
                                }}
                            >
                                {currencies.map((item) => (
                                    <SelectOption value={item} key={item}>{item}</SelectOption>
                                ))}
                            </Select>
                        </label>
                        <button ref={newGoalButtonRef} type="button" onClick={() => setCreateOpen(true)}><Icon name="plus"/>New goal</button>
                    </div>
                </header>

                {notice && (
                    <div className={`goals-notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
                        <Icon name={notice.type === 'error' ? 'alert' : 'check-circle'}/>
                        <span>{notice.text}</span>
                        <button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}><Icon name="close"/></button>
                    </div>
                )}

                <div className="goals-layout">
                    <div className="goals-primary-column">
                        <section className="goals-summary" aria-label="Goals overview">
                            {overviewState === 'loading' && Array.from({length: 4}, (_, index) => <article className="goal-summary-card loading" key={index}><span/><i/><b/></article>)}
                            {overviewState === 'error' && (
                                <article className="goal-summary-error"><Icon name="alert"/><p>{overviewError}</p><button type="button" onClick={() => loadOverview()}>Try again</button></article>
                            )}
                            {overviewState === 'ready' && summary && (
                                <>
                                    <article className="goal-summary-card emerald">
                                        <span><Icon name="target"/></span><p>Total saved</p>
                                        <strong>{formatGoalMoney(summary.totalSavedAmount, currency)}</strong>
                                        <small>+{formatGoalMoney(summary.contributedThisMonthAmount, currency)} this month</small>
                                    </article>
                                    <article className="goal-summary-card gold">
                                        <span><Icon name="plus"/></span><p>Monthly plan</p>
                                        <strong>{formatGoalMoney(summary.plannedMonthlyAmount, currency)}</strong>
                                        <small>{formatGoalMoney(summary.contributedThisMonthAmount, currency)} already added · {Math.round(summary.monthlyPlanCompletionPercentage)}%</small>
                                    </article>
                                    <article className="goal-summary-card blue">
                                        <span><Icon name="check-circle"/></span><p>Goals on track</p>
                                        <strong>{summary.healthyGoalCount} of {summary.activeGoalCount}</strong>
                                        <small>{summary.attentionGoalCount === 0 ? 'Every plan is healthy' : `${summary.attentionGoalCount} ${summary.attentionGoalCount === 1 ? 'plan needs' : 'plans need'} attention`}</small>
                                    </article>
                                    <article className="goal-summary-card purple">
                                        <span><Icon name="calendar"/></span><p>Nearest target</p>
                                        <strong>{nearest ? formatGoalMonth(nearest.targetMonth) : 'No target yet'}</strong>
                                        <small>{nearest ? `${nearest.goalName} · ${formatGoalMoney(nearest.remainingAmount, currency)} left` : 'Create a goal to start planning'}</small>
                                    </article>
                                </>
                            )}
                        </section>

                        <section className="goals-list-panel">
                            <header>
                                <div><h2>Your goals</h2><p>Plans and their current contribution pace.</p></div>
                                <div className="goals-list-controls">
                                    <div className="goal-status-tabs" role="tablist" aria-label="Goal status">
                                        <button type="button" role="tab" aria-selected={status === 'ACTIVE'} className={status === 'ACTIVE' ? 'active' : undefined} onClick={() => changeStatus('ACTIVE')}>Active · {goalPage?.statusCounts.active ?? 0}</button>
                                        <button type="button" role="tab" aria-selected={status === 'PAUSED'} className={status === 'PAUSED' ? 'active' : undefined} onClick={() => changeStatus('PAUSED')}>Paused{status === 'PAUSED' ? ` · ${goalPage?.totalElements ?? 0}` : ''}</button>
                                        <button type="button" role="tab" aria-selected={status === 'ACHIEVED'} className={status === 'ACHIEVED' ? 'active' : undefined} onClick={() => changeStatus('ACHIEVED')}>Done · {goalPage?.statusCounts.completed ?? 0}</button>
                                    </div>
                                    <Select aria-label="Sort goals" value={sort} onValueChange={(value) => {setListState('loading'); setSort(value as GoalSort); setPage(0)}}>
                                        {Object.entries(sortLabels).map(([value, label]) => <SelectOption value={value} key={value}>{label}</SelectOption>)}
                                    </Select>
                                </div>
                            </header>

                            {listState === 'loading' && <div className="goals-list-loading"><LoadingIndicator label="Loading goals"/></div>}
                            {listState === 'error' && (
                                <div className="goals-empty-state"><span><Icon name="alert"/></span><h3>Goals are unavailable</h3><p>{listError}</p><button type="button" onClick={() => loadGoals()}>Try again</button></div>
                            )}
                            {listState === 'ready' && goalPage?.items.length === 0 && (
                                <div className="goals-empty-state">
                                    <span><Icon name={status === 'ACHIEVED' ? 'check-circle' : 'target'}/></span>
                                    <h3>{status === 'ACTIVE' ? 'Set your first goal' : status === 'PAUSED' ? 'No paused goals' : 'No completed goals yet'}</h3>
                                    <p>{status === 'ACTIVE' ? 'Create a measurable target and Certis will help you plan the monthly pace.' : 'Goals with this status will appear here.'}</p>
                                    {status === 'ACTIVE' && <button type="button" onClick={() => setCreateOpen(true)}><Icon name="plus"/>Create goal</button>}
                                </div>
                            )}
                            {listState === 'ready' && goalPage && goalPage.items.length > 0 && (
                                <div className="goal-card-grid">
                                    {goalPage.items.map((goal) => (
                                        <GoalCard
                                            key={goal.id}
                                            goal={goal}
                                            menuOpen={openMenuId === goal.id}
                                            onOpenMenu={(trigger) => {
                                                window.setTimeout(() => setOpenMenuId((current) => current === goal.id ? null : goal.id), 0)
                                                dialogTriggerRef.current = trigger
                                            }}
                                            onDetails={(trigger) => showDetails(goal, trigger)}
                                            onEdit={(trigger) => showEdit(goal, trigger)}
                                            onContribution={(trigger) => showContribution(goal, trigger)}
                                            onToggleStatus={() => void toggleStatus(goal)}
                                        />
                                    ))}
                                </div>
                            )}

                            {goalPage && goalPage.totalPages > 1 && (
                                <footer className="goals-pagination">
                                    <span>Page {goalPage.page + 1} of {goalPage.totalPages}</span>
                                    <div><button type="button" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Previous</button><button type="button" disabled={page + 1 >= goalPage.totalPages} onClick={() => setPage((current) => current + 1)}>Next</button></div>
                                </footer>
                            )}
                        </section>
                    </div>

                    <aside className="goals-insights" aria-label="Goal insights">
                        <section className="goals-insight-card current-month">
                            <header><h2>This month</h2><p>Planned contributions · {currency}</p></header>
                            {overviewState === 'ready' && thisMonth ? (
                                <>
                                    <div className="goals-insight-total"><strong>{formatGoalMoney(thisMonth.contributedAmount, currency)}</strong><span>of {formatGoalMoney(thisMonth.plannedAmount, currency)}</span></div>
                                    <span className="goal-progress-track"><i style={{width: `${Math.min(thisMonth.progressPercentage, 100)}%`}}/></span>
                                    <div className="goals-insight-progress"><span>{Math.round(thisMonth.progressPercentage)}% funded</span><span>{formatGoalMoney(thisMonth.remainingAmount, currency)} remaining</span></div>
                                    <div className="goals-month-contributions">
                                        {thisMonth.contributions.length === 0 && <p>No contributions this month.</p>}
                                        {thisMonth.contributions.slice(0, 4).map((item) => (
                                            <button type="button" key={item.goalId} onClick={(event) => {
                                                const goal = goalPage?.items.find((candidate) => candidate.id === item.goalId)
                                                if (goal) showDetails(goal, event.currentTarget)
                                            }}>
                                                <i style={{background: item.color}}/><span>{item.goalName}</span><strong>+{formatGoalMoney(item.amount, currency)}</strong>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            ) : overviewState === 'error' ? <p className="goals-insight-message">Overview unavailable.</p> : <div className="goals-insight-skeleton"><span/><span/><span/></div>}
                        </section>

                        <section className="goals-insight-card milestone">
                            <header><h2>Next milestone</h2>{nearest && <em>{nearest.monthsRemaining} {nearest.monthsRemaining === 1 ? 'month' : 'months'}</em>}</header>
                            {overviewState === 'ready' && nearest ? (
                                <>
                                    <div className="goal-milestone-title"><span style={{color: nearest.color}}><Icon name={goalIconName(nearest.icon)}/></span><div><strong>{nearest.goalName}</strong><small>Target · {formatGoalMonth(nearest.targetMonth)}</small></div></div>
                                    <div className="goal-milestone-remaining"><strong>{formatGoalMoney(nearest.remainingAmount, currency)}</strong><span>remaining</span></div>
                                    <span className="goal-progress-track"><i style={{width: `${Math.min(nearest.progressPercentage, 100)}%`, background: nearest.color}}/></span>
                                    <p>At {formatGoalMoney(nearest.monthlyContributionAmount, currency)}/month, your plan is {nearest.paceStatus === 'ADJUST_PLAN' ? 'behind its target pace.' : 'on schedule.'}</p>
                                </>
                            ) : overviewState === 'ready' ? <p className="goals-insight-message">Your next target will appear here.</p> : <div className="goals-insight-skeleton"><span/><span/><span/></div>}
                        </section>

                        {overviewState === 'ready' && overview?.recommendation && (
                            <section className="goals-recommendation">
                                <header><span><Icon name="trend-up"/></span><div><h2>Stay on course</h2><p>One goal needs a small adjustment.</p></div></header>
                                <p>Add {formatGoalMoney(overview.recommendation.differenceAmount, currency)}/month to <strong>{overview.recommendation.goalName}</strong> to keep the {formatGoalMonth(overview.recommendation.targetMonth)} target realistic.</p>
                                <button type="button" onClick={(event) => void reviewRecommendation(event.currentTarget)}>Review contribution plan</button>
                            </section>
                        )}
                    </aside>
                </div>
            </main>

            {isCreateOpen && (
                <GoalFormModal
                    accounts={accounts}
                    defaultCurrency={currency}
                    onClose={() => setCreateOpen(false)}
                    onSaved={(saved) => {
                        setCreateOpen(false)
                        setCurrency(saved.currency)
                        setStatus('ACTIVE')
                        setNotice({type: 'success', text: `${saved.name} was created.`})
                        refresh()
                    }}
                    restoreFocus={() => newGoalButtonRef.current?.focus()}
                />
            )}

            {editingGoal && (
                <GoalFormModal
                    goal={editingGoal}
                    accounts={accounts}
                    defaultCurrency={editingGoal.currency}
                    onClose={() => setEditingGoal(null)}
                    onSaved={(saved) => {
                        setEditingGoal(null)
                        setNotice({type: 'success', text: `${saved.name} was updated.`})
                        refresh()
                    }}
                    restoreFocus={() => dialogTriggerRef.current?.focus()}
                />
            )}

            {contributionGoal && (
                <GoalContributionModal
                    goal={contributionGoal}
                    accounts={accounts}
                    onClose={() => setContributionGoal(null)}
                    onSaved={() => {
                        const name = contributionGoal.name
                        setContributionGoal(null)
                        setNotice({type: 'success', text: `Progress added to ${name}.`})
                        refresh()
                    }}
                    restoreFocus={() => dialogTriggerRef.current?.focus()}
                />
            )}

            {detailsGoal && (
                <GoalDetailsModal
                    goal={detailsGoal}
                    accounts={accounts}
                    onClose={() => setDetailsGoal(null)}
                    onEdit={(selected) => {
                        setDetailsGoal(null)
                        setEditingGoal(selected)
                    }}
                    onAddProgress={(selected) => {
                        setDetailsGoal(null)
                        setContributionGoal(selected)
                    }}
                    onChanged={(changed) => {
                        setDetailsGoal(changed)
                        refresh()
                    }}
                    onCancelled={(goalId) => {
                        setDetailsGoal(null)
                        setNotice({type: 'success', text: 'Goal cancelled.'})
                        setGoalPage((current) => current
                            ? {...current, items: current.items.filter((item) => item.id !== goalId)}
                            : current)
                        refresh()
                    }}
                    restoreFocus={() => dialogTriggerRef.current?.focus()}
                />
            )}
        </div>
    )
}
