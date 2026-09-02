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
    getCategoryCards,
    restoreCategory,
} from '../api/categoriesApi'
import type {
    Category,
    CategoryCard,
    CategoryCardSort,
} from '../api/categoriesApi'

export type CategoryLoadState =
    | 'loading'
    | 'ready'
    | 'error'

export type CategoryNotice = {
    kind: 'success' | 'error'
    message: string
}

const categoryLoadErrorMessage = (
    error: unknown,
): string =>
    error instanceof ApiError
        ? error.message
        : 'We could not load your categories. Please try again.'

const categoryRestoreErrorMessage = (
    error: unknown,
): string =>
    error instanceof ApiError
        ? error.message
        : 'We could not restore this category. Please try again.'

const currentMonth = (): string => {
    const today = new Date()
    const month = String(today.getMonth() + 1).padStart(2, '0')

    return `${today.getFullYear()}-${month}`
}

const emptyCategoryCard = (category: Category): CategoryCard => ({
    ...category,
    monthlyTransactionCount: 0,
    monthlyAmount: 0,
    monthlySharePercentage: 0,
})

export function useCategories(initialCurrency: Currency) {
    const [categories, setCategories] =
        useState<CategoryCard[]>([])
    const [month] = useState(currentMonth)
    const [currency, setCurrency] =
        useState<Currency>(initialCurrency)
    const [sort, setSort] =
        useState<CategoryCardSort>('AMOUNT_DESC')
    const [page, setPage] = useState(0)
    const [pageSize, setPageSize] = useState(20)
    const [totalElements, setTotalElements] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [loadState, setLoadState] =
        useState<CategoryLoadState>('loading')
    const [loadError, setLoadError] = useState('')
    const [notice, setNotice] =
        useState<CategoryNotice | null>(null)
    const [restoringCategoryId, setRestoringCategoryId] =
        useState<string | null>(null)
    const loadRequestIdRef = useRef(0)

    const loadCategories = useCallback(async () => {
        const requestId = ++loadRequestIdRef.current

        setLoadState('loading')
        setLoadError('')

        try {
            const response = await getCategoryCards({
                month,
                currency,
                page,
                size: pageSize,
                sort,
            })

            if (requestId !== loadRequestIdRef.current) {
                return
            }

            setCategories(response.categories)
            setPage(response.page)
            setPageSize(response.size)
            setTotalElements(response.totalElements)
            setTotalPages(response.totalPages)
            setLoadState('ready')
        } catch (error) {
            if (requestId !== loadRequestIdRef.current) {
                return
            }

            setLoadError(categoryLoadErrorMessage(error))
            setLoadState('error')
        }
    }, [currency, month, page, pageSize, sort])

    useEffect(() => {
        let isActive = true

        queueMicrotask(() => {
            if (isActive) {
                void loadCategories()
            }
        })

        return () => {
            isActive = false
            loadRequestIdRef.current += 1
        }
    }, [loadCategories])

    useEffect(() => {
        if (!notice) {
            return
        }

        const timeoutId = window.setTimeout(
            () => setNotice(null),
            3200,
        )

        return () => window.clearTimeout(timeoutId)
    }, [notice])

    const activeCategories = useMemo(
        () => categories.filter(
            (category) => !category.archivedAt,
        ),
        [categories],
    )

    const archivedCategories = useMemo(
        () => categories.filter(
            (category) => Boolean(category.archivedAt),
        ),
        [categories],
    )

    const saveCategory = useCallback((
        savedCategory: Category,
        isEditing: boolean,
    ) => {
        loadRequestIdRef.current += 1
        setCategories((current) =>
            isEditing
                ? current.map((category) =>
                    category.id === savedCategory.id
                        ? {
                            ...category,
                            ...savedCategory,
                        }
                        : category,
                )
                : [emptyCategoryCard(savedCategory), ...current],
        )
        if (!isEditing) {
            setTotalElements((current) => current + 1)
            setTotalPages(Math.ceil((totalElements + 1) / pageSize))
        }
        setLoadError('')
        setLoadState('ready')
        setNotice({
            kind: 'success',
            message: isEditing
                ? 'Category updated.'
                : 'Category created.',
        })
    }, [pageSize, totalElements])

    const changeCurrency = useCallback((nextCurrency: Currency) => {
        setPage(0)
        setCurrency(nextCurrency)
    }, [])

    const changeSort = useCallback((nextSort: CategoryCardSort) => {
        setPage(0)
        setSort(nextSort)
    }, [])

    const markCategoryArchived = useCallback((
        archivedCategory: Category,
    ) => {
        setCategories((current) => current.map(
            (category) =>
                category.id === archivedCategory.id
                    ? {
                        ...category,
                        archivedAt: new Date().toISOString(),
                    }
                    : category,
        ))
        setNotice({
            kind: 'success',
            message: 'Category archived. You can restore it from Archived.',
        })
    }, [])

    const restoreArchivedCategory = useCallback(async (
        category: Category,
    ): Promise<boolean> => {
        setRestoringCategoryId(category.id)
        setNotice(null)

        try {
            await restoreCategory(category.id)
            setCategories((current) => current.map(
                (currentCategory) =>
                    currentCategory.id === category.id
                        ? {
                            ...currentCategory,
                            archivedAt: null,
                        }
                        : currentCategory,
            ))
            setNotice({
                kind: 'success',
                message: 'Category restored.',
            })
            return true
        } catch (error) {
            setNotice({
                kind: 'error',
                message: categoryRestoreErrorMessage(error),
            })
            return false
        } finally {
            setRestoringCategoryId(null)
        }
    }, [])

    return {
        activeCategories,
        archivedCategories,
        changeCurrency,
        changeSort,
        currency,
        loadCategories,
        loadError,
        loadState,
        markCategoryArchived,
        month,
        notice,
        page,
        pageSize,
        restoringCategoryId,
        restoreArchivedCategory,
        saveCategory,
        setPage,
        sort,
        totalElements,
        totalPages,
    }
}
