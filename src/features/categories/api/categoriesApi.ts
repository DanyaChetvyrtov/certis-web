import {apiRequest} from '../../../shared/api/client'
import type {Currency} from '../../../shared/currency'

export const categoryTypes = ['EXPENSE', 'INCOME'] as const

export const categoryIcons = [
    'gift',
    'utensils',
    'transport',
    'heart',
    'home',
    'shopping-cart',
    'repeat',
    'briefcase',
] as const

export type CategoryType = (typeof categoryTypes)[number]
export type CategoryIcon = (typeof categoryIcons)[number]

export type Category = {
    id: string
    name: string
    type: CategoryType
    icon: string
    color: string
    archivedAt?: string | null
}

export type CategoryCard = Category & {
    monthlyTransactionCount: number
    monthlyAmount: number
    monthlySharePercentage: number
}

export const categoryCardSorts = [
    'NAME',
    'AMOUNT_DESC',
    'AMOUNT_ASC',
] as const

export type CategoryCardSort = (typeof categoryCardSorts)[number]

export type CategoryCardPageRequest = {
    month: string
    currency: Currency
    page?: number
    size?: number
    sort?: CategoryCardSort
}

export type CategoryCardsResponse = {
    month: string
    currency: Currency
    categories: CategoryCard[]
    page: number
    size: number
    totalElements: number
    totalPages: number
}

export type CategoryAnalyticsRequest = {
    month: string
    currency: Currency
    type: CategoryType
    topLimit?: number
}

export type TopCategoryAnalytics = {
    categoryId: string
    name: string
    color: string
    amount: number
    sharePercentage: number
}

export type CategoryAnalytics = {
    month: string
    currency: Currency
    type: CategoryType
    totalTransactionCount: number
    categorizedTransactionCount: number
    uncategorizedTransactionCount: number
    totalSum: number
    categorizedSum: number
    uncategorizedSum: number
    coveragePercentage: number | null
    topExpenseCategories: TopCategoryAnalytics[]
}

export type CategoryOption = {
    id: string
    name: string
    icon: string
    color: string
}

export type CreateCategoryRequest = {
    name: string
    type: CategoryType
    icon: CategoryIcon
    color: string
}

export type UpdateCategoryRequest = {
    name: string
    icon: string
    color: string
}

const categoryPath = (categoryId: string) =>
    `/api/v1/categories/${categoryId}`

export const isCategoryIcon = (
    icon: string,
): icon is CategoryIcon =>
    categoryIcons.includes(
        icon as CategoryIcon,
    )

export const getCategoryCards = (
    request: CategoryCardPageRequest,
    signal?: AbortSignal,
) => {
    const searchParams = new URLSearchParams({
        month: request.month,
        currency: request.currency,
        page: String(request.page ?? 0),
        size: String(request.size ?? 20),
        sort: request.sort ?? 'AMOUNT_DESC',
    })

    return apiRequest<CategoryCardsResponse>(
        `/api/v1/categories?${searchParams}`,
        {
            signal,
            fallbackMessage: 'We could not load your categories. Please try again.',
        },
    )
}

export const getAllCategoryCards = async (
    request: Omit<CategoryCardPageRequest, 'page' | 'size'>,
    signal?: AbortSignal,
): Promise<CategoryCard[]> => {
    const firstPage = await getCategoryCards({
        ...request,
        page: 0,
        size: 100,
    }, signal)

    if (firstPage.totalPages <= 1) {
        return firstPage.categories
    }

    const remainingPages = await Promise.all(
        Array.from(
            {length: firstPage.totalPages - 1},
            (_, index) => getCategoryCards({
                ...request,
                page: index + 1,
                size: 100,
            }, signal),
        ),
    )

    return [
        ...firstPage.categories,
        ...remainingPages.flatMap((page) => page.categories),
    ]
}

export const getCategoryAnalytics = (
    request: CategoryAnalyticsRequest,
    signal?: AbortSignal,
) => {
    const searchParams = new URLSearchParams({
        month: request.month,
        currency: request.currency,
        type: request.type,
        topLimit: String(request.topLimit ?? 4),
    })

    return apiRequest<CategoryAnalytics>(
        `/api/v1/categories/analytics?${searchParams}`,
        {
            signal,
            fallbackMessage: 'We could not load category statistics. Please try again.',
        },
    )
}

export const getCategoryOptions = (
    type: CategoryType,
    signal?: AbortSignal,
) => {
    const searchParams = new URLSearchParams({type})

    return apiRequest<CategoryOption[]>(
        `/api/v1/categories/options?${searchParams}`,
        {
            signal,
            fallbackMessage: 'We could not load category options. Please try again.',
        },
    )
}

export const getCategory = (categoryId: string) =>
    apiRequest<Category>(categoryPath(categoryId), {
        fallbackMessage: 'We could not load this category. Please try again.',
    })

export const createCategory = (
    request: CreateCategoryRequest,
) =>
    apiRequest<Category>('/api/v1/categories', {
        method: 'POST',
        body: request,
        fallbackMessage: 'We could not create this category. Please try again.',
    })

export const updateCategory = (
    categoryId: string,
    request: UpdateCategoryRequest,
) =>
    apiRequest<Category>(categoryPath(categoryId), {
        method: 'PUT',
        body: request,
        fallbackMessage: 'We could not update this category. Please try again.',
    })

export const archiveCategory = (categoryId: string) =>
    apiRequest(categoryPath(categoryId), {
        method: 'DELETE',
        fallbackMessage: 'We could not archive this category. Please try again.',
    })

export const restoreCategory = (categoryId: string) =>
    apiRequest(`${categoryPath(categoryId)}/restore`, {
        method: 'POST',
        fallbackMessage: 'We could not restore this category. Please try again.',
    })
