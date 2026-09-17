import {http, HttpResponse} from 'msw'
import {setupServer} from 'msw/node'

export const server = setupServer(
    http.get('/api/v1/categories/analytics/spending-over-time', ({request}) => {
        const searchParams = new URL(request.url).searchParams
        return HttpResponse.json({
            month: searchParams.get('month'),
            currency: searchParams.get('currency'),
            type: searchParams.get('type'),
            totalSum: 0,
            series: [],
        })
    }),
    // Most dashboard tests have no applied budget; tests with a budget override this handler.
    http.get('/api/v1/budgets/:month', () => new HttpResponse(null, {status: 404})),
)
