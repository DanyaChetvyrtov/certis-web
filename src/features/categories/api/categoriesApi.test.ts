import {
    http,
    HttpResponse,
} from 'msw'
import {
    describe,
    expect,
    it,
} from 'vitest'
import {server} from '../../../test/server'
import {
    archiveCategory,
    createCategory,
    getCategories,
    getCategory,
    restoreCategory,
    updateCategory,
} from './categoriesApi'

const category = {
    id: 'category-id',
    name: 'Groceries',
    type: 'EXPENSE' as const,
    icon: 'shopping-cart',
    color: '#E6655A',
    archivedAt: null,
}

describe('categoriesApi', () => {
    it('loads all categories for the authenticated user', async () => {
        server.use(
            http.get(
                '/api/v1/categories',
                () => HttpResponse.json([category]),
            ),
        )

        await expect(getCategories()).resolves.toEqual([category])
    })

    it('loads one category by id', async () => {
        server.use(
            http.get(
                '/api/v1/categories/:categoryId',
                ({params}) => {
                    expect(params.categoryId).toBe(category.id)
                    return HttpResponse.json(category)
                },
            ),
        )

        await expect(getCategory(category.id)).resolves.toEqual(category)
    })

    it('creates a category using the backend contract', async () => {
        server.use(
            http.post(
                '/api/v1/categories',
                async ({request}) => {
                    await expect(request.json()).resolves.toEqual({
                        name: category.name,
                        type: category.type,
                        icon: category.icon,
                        color: category.color,
                    })

                    return HttpResponse.json(
                        category,
                        {status: 201},
                    )
                },
            ),
        )

        await expect(createCategory({
            name: category.name,
            type: category.type,
            icon: 'shopping-cart',
            color: category.color,
        })).resolves.toEqual(category)
    })

    it('updates category fields without sending its type', async () => {
        server.use(
            http.put(
                '/api/v1/categories/:categoryId',
                async ({request}) => {
                    await expect(request.json()).resolves.toEqual({
                        name: 'Food',
                        icon: 'utensils',
                        color: '#E58E4E',
                    })

                    return HttpResponse.json({
                        ...category,
                        name: 'Food',
                        icon: 'utensils',
                        color: '#E58E4E',
                    })
                },
            ),
        )

        await expect(updateCategory(category.id, {
            name: 'Food',
            icon: 'utensils',
            color: '#E58E4E',
        })).resolves.toMatchObject({
            name: 'Food',
            type: 'EXPENSE',
        })
    })

    it('archives a category with DELETE', async () => {
        server.use(
            http.delete(
                '/api/v1/categories/:categoryId',
                () => new HttpResponse(null, {status: 204}),
            ),
        )

        await expect(
            archiveCategory(category.id),
        ).resolves.toBeUndefined()
    })

    it('restores a category with POST', async () => {
        server.use(
            http.post(
                '/api/v1/categories/:categoryId/restore',
                ({params}) => {
                    expect(params.categoryId).toBe(category.id)
                    return new HttpResponse(null, {status: 204})
                },
            ),
        )

        await expect(
            restoreCategory(category.id),
        ).resolves.toBeUndefined()
    })
})
