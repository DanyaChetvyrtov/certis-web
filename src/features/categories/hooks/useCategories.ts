import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import {ApiError} from '../../../shared/api/ApiError'
import {
    getCategories,
    restoreCategory,
} from '../api/categoriesApi'
import type {Category} from '../api/categoriesApi'

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

export function useCategories() {
    const [categories, setCategories] =
        useState<Category[]>([])
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
            const loadedCategories = await getCategories()

            if (requestId !== loadRequestIdRef.current) {
                return
            }

            setCategories(loadedCategories)
            setLoadState('ready')
        } catch (error) {
            if (requestId !== loadRequestIdRef.current) {
                return
            }

            setLoadError(categoryLoadErrorMessage(error))
            setLoadState('error')
        }
    }, [])

    useEffect(() => {
        const requestId = ++loadRequestIdRef.current

        void getCategories().then(
            (loadedCategories) => {
                if (requestId !== loadRequestIdRef.current) {
                    return
                }

                setCategories(loadedCategories)
                setLoadState('ready')
            },
            (error: unknown) => {
                if (requestId !== loadRequestIdRef.current) {
                    return
                }

                setLoadError(categoryLoadErrorMessage(error))
                setLoadState('error')
            },
        )

        return () => {
            loadRequestIdRef.current += 1
        }
    }, [])

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
                        ? savedCategory
                        : category,
                )
                : [savedCategory, ...current],
        )
        setLoadError('')
        setLoadState('ready')
        setNotice({
            kind: 'success',
            message: isEditing
                ? 'Category updated.'
                : 'Category created.',
        })
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
        loadCategories,
        loadError,
        loadState,
        markCategoryArchived,
        notice,
        restoringCategoryId,
        restoreArchivedCategory,
        saveCategory,
    }
}
