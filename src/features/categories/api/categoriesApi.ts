import {apiRequest} from '../../../shared/api/client'

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

export const getCategories = () =>
    apiRequest<Category[]>('/api/v1/categories', {
        fallbackMessage: 'We could not load your categories. Please try again.',
    })

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
