import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import {ApiError} from '../../../shared/api/ApiError'
import type {Currency} from '../../../shared/currency'
import {
    getAccounts,
} from '../../accounts/api/accountsApi'
import type {Account} from '../../accounts/api/accountsApi'
import {
    assignTransactionCategories,
    getUncategorizedTransactions,
} from '../../transactions/api/transactionsApi'
import type {
    UncategorizedTransactionsResponse,
} from '../../transactions/api/transactionsApi'
import {
    getCategoryOptions,
} from '../api/categoriesApi'
import type {
    CategoryOption,
    CategoryType,
} from '../api/categoriesApi'

export type AssignmentLoadState = 'loading' | 'ready' | 'error'

type UseUncategorizedTransactionsOptions = {
    currency: Currency
    month: string
    type: CategoryType
    onAssigned: () => Promise<void>
}

const errorMessage = (
    error: unknown,
    fallback: string,
): string =>
    error instanceof ApiError
        ? error.message
        : fallback

export function useUncategorizedTransactions({
    currency,
    month,
    type,
    onAssigned,
}: UseUncategorizedTransactionsOptions) {
    const [categoryOptions, setCategoryOptions] =
        useState<CategoryOption[]>([])
    const [accounts, setAccounts] = useState<Account[]>([])
    const [optionState, setOptionState] =
        useState<AssignmentLoadState>('loading')
    const [optionError, setOptionError] = useState('')
    const [transactions, setTransactions] =
        useState<UncategorizedTransactionsResponse | null>(null)
    const [transactionState, setTransactionState] =
        useState<AssignmentLoadState>('loading')
    const [transactionError, setTransactionError] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [appliedSearch, setAppliedSearch] = useState('')
    const [accountId, setAccountId] = useState('')
    const [page, setPage] = useState(0)
    const [selectedIds, setSelectedIds] =
        useState<Set<string>>(() => new Set())
    const [categoryByTransaction, setCategoryByTransaction] =
        useState<Record<string, string>>({})
    const [isAssigning, setIsAssigning] = useState(false)
    const [assignmentError, setAssignmentError] = useState('')
    const [assignmentNotice, setAssignmentNotice] = useState('')
    const transactionRequestIdRef = useRef(0)

    const loadOptions = useCallback(async () => {
        setOptionState('loading')
        setOptionError('')

        try {
            const [nextCategories, nextAccounts] = await Promise.all([
                getCategoryOptions(type),
                getAccounts(),
            ])

            setCategoryOptions(nextCategories)
            setAccounts(nextAccounts.filter(
                (account) => account.currency === currency,
            ))
            setOptionState('ready')
        } catch (error) {
            setOptionError(errorMessage(
                error,
                'We could not load assignment options. Please try again.',
            ))
            setOptionState('error')
        }
    }, [currency, type])

    const loadTransactions = useCallback(async () => {
        const requestId = ++transactionRequestIdRef.current

        setTransactionState('loading')
        setTransactionError('')

        try {
            const response = await getUncategorizedTransactions({
                month,
                currency,
                type,
                accountId: accountId || undefined,
                search: appliedSearch || undefined,
                page,
                size: 20,
            })

            if (requestId !== transactionRequestIdRef.current) {
                return
            }

            setTransactions(response)
            setTransactionState('ready')
        } catch (error) {
            if (requestId !== transactionRequestIdRef.current) {
                return
            }

            setTransactionError(errorMessage(
                error,
                'We could not load uncategorized transactions. Please try again.',
            ))
            setTransactionState('error')
        }
    }, [accountId, appliedSearch, currency, month, page, type])

    useEffect(() => {
        let isActive = true

        queueMicrotask(() => {
            if (isActive) {
                void loadOptions()
            }
        })

        return () => {
            isActive = false
        }
    }, [loadOptions])

    useEffect(() => {
        let isActive = true

        queueMicrotask(() => {
            if (isActive) {
                void loadTransactions()
            }
        })

        return () => {
            isActive = false
            transactionRequestIdRef.current += 1
        }
    }, [loadTransactions])

    useEffect(() => {
        const normalizedSearch = searchQuery.trim()

        if (normalizedSearch === appliedSearch) {
            return
        }

        const timeoutId = window.setTimeout(() => {
            setPage(0)
            setSelectedIds(new Set())
            setAppliedSearch(normalizedSearch)
        }, 300)

        return () => window.clearTimeout(timeoutId)
    }, [appliedSearch, searchQuery])

    const selectedAssignments = useMemo(
        () => Array.from(selectedIds)
            .map((transactionId) => ({
                transactionId,
                categoryId: categoryByTransaction[transactionId],
            }))
            .filter((assignment) => Boolean(assignment.categoryId)),
        [categoryByTransaction, selectedIds],
    )

    const hasIncompleteSelection =
        selectedAssignments.length !== selectedIds.size

    const toggleTransaction = useCallback((
        transactionId: string,
        checked: boolean,
    ) => {
        setAssignmentError('')
        setAssignmentNotice('')
        setSelectedIds((current) => {
            const next = new Set(current)

            if (checked) {
                next.add(transactionId)
            } else {
                next.delete(transactionId)
            }

            return next
        })

        if (
            checked
            && !categoryByTransaction[transactionId]
            && categoryOptions[0]
        ) {
            setCategoryByTransaction((current) => ({
                ...current,
                [transactionId]: categoryOptions[0].id,
            }))
        }
    }, [categoryByTransaction, categoryOptions])

    const chooseCategory = useCallback((
        transactionId: string,
        categoryId: string,
    ) => {
        setAssignmentError('')
        setAssignmentNotice('')
        setCategoryByTransaction((current) => ({
            ...current,
            [transactionId]: categoryId,
        }))
        setSelectedIds((current) => {
            const next = new Set(current)

            if (categoryId) {
                next.add(transactionId)
            } else {
                next.delete(transactionId)
            }

            return next
        })
    }, [])

    const changeAccount = useCallback((nextAccountId: string) => {
        setAccountId(nextAccountId)
        setPage(0)
        setSelectedIds(new Set())
    }, [])

    const goToPreviousPage = useCallback(() => {
        setSelectedIds(new Set())
        setPage((current) => Math.max(0, current - 1))
    }, [])

    const goToNextPage = useCallback(() => {
        setSelectedIds(new Set())
        setPage((current) => current + 1)
    }, [])

    const assignSelected = useCallback(async () => {
        if (selectedIds.size === 0 || hasIncompleteSelection) {
            setAssignmentError(
                selectedIds.size === 0
                    ? 'Select at least one transaction.'
                    : 'Choose a category for every selected transaction.',
            )
            return
        }

        setIsAssigning(true)
        setAssignmentError('')
        setAssignmentNotice('')

        try {
            const assignedCount = selectedAssignments.length

            await assignTransactionCategories(selectedAssignments)
            setSelectedIds(new Set())
            setCategoryByTransaction({})
            setAssignmentNotice(
                `${assignedCount} ${assignedCount === 1 ? 'transaction' : 'transactions'} categorized.`,
            )
            await onAssigned()

            if (
                transactions
                && assignedCount >= transactions.items.length
                && page > 0
            ) {
                setPage((current) => Math.max(0, current - 1))
            } else {
                await loadTransactions()
            }
        } catch (error) {
            setAssignmentError(errorMessage(
                error,
                'We could not assign the selected categories. Please try again.',
            ))
        } finally {
            setIsAssigning(false)
        }
    }, [
        hasIncompleteSelection,
        loadTransactions,
        onAssigned,
        page,
        selectedAssignments,
        selectedIds.size,
        transactions,
    ])

    const visibleAccounts = accounts.filter(
        (account) => !account.closedAt
        || transactions?.items.some(
            (transaction) => transaction.account.id === account.id,
        ),
    )

    return {
        accountId,
        appliedSearch,
        assignmentError,
        assignmentNotice,
        categoryByTransaction,
        categoryOptions,
        changeAccount,
        chooseCategory,
        goToNextPage,
        goToPreviousPage,
        hasIncompleteSelection,
        isAssigning,
        loadOptions,
        loadTransactions,
        optionError,
        optionState,
        page,
        searchQuery,
        selectedCount: selectedIds.size,
        selectedIds,
        setSearchQuery,
        transactionError,
        transactions,
        transactionState,
        toggleTransaction,
        visibleAccounts,
        assignSelected,
    }
}
