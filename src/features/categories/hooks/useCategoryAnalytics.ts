import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'
import {useTranslation} from 'react-i18next'
import {ApiError} from '../../../shared/api/ApiError'
import type {Currency} from '../../../shared/currency'
import {
    getCategoryAnalytics,
} from '../api/categoriesApi'
import type {
    CategoryAnalytics,
    CategoryType,
} from '../api/categoriesApi'

export type CategoryAnalyticsLoadState =
    | 'loading'
    | 'ready'
    | 'error'

const analyticsLoadErrorMessage = (
    error: unknown,
    fallback: string,
): string =>
    error instanceof ApiError
        ? error.message
        : fallback

export function useCategoryAnalytics(
    month: string,
    currency: Currency,
    type: CategoryType,
) {
    const {t} = useTranslation()
    const [analytics, setAnalytics] =
        useState<CategoryAnalytics | null>(null)
    const [loadState, setLoadState] =
        useState<CategoryAnalyticsLoadState>('loading')
    const [loadError, setLoadError] = useState('')
    const loadRequestIdRef = useRef(0)

    const loadAnalytics = useCallback(async () => {
        const requestId = ++loadRequestIdRef.current

        setLoadState('loading')
        setLoadError('')

        try {
            const response = await getCategoryAnalytics({
                month,
                currency,
                type,
                topLimit: 4,
            })

            if (requestId !== loadRequestIdRef.current) {
                return
            }

            setAnalytics(response)
            setLoadState('ready')
        } catch (error) {
            if (requestId !== loadRequestIdRef.current) {
                return
            }

            setLoadError(analyticsLoadErrorMessage(
                error,
                t('categories.analytics.loadError'),
            ))
            setLoadState('error')
        }
    }, [currency, month, type, t])

    useEffect(() => {
        let isActive = true

        queueMicrotask(() => {
            if (isActive) {
                void loadAnalytics()
            }
        })

        return () => {
            isActive = false
            loadRequestIdRef.current += 1
        }
    }, [loadAnalytics])

    return {
        analytics,
        loadAnalytics,
        loadError,
        loadState,
    }
}
