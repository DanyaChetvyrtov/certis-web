import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import {
    createTransfer,
    getTransfer,
    getTransfers,
    reverseTransfer,
} from './transfersApi'

const response = (body: unknown, status = 200) =>
    new Response(
        body === undefined ? null : JSON.stringify(body),
        {
            status,
            headers: body === undefined
                ? undefined
                : {'Content-Type': 'application/json'},
        },
    )

const transfer = {
    id: 'transfer-id',
    sourceAccountId: 'checking-id',
    destinationAccountId: 'savings-id',
    reversalOfTransferId: null,
    currency: 'EUR',
    amount: 25.5,
    note: 'Move to savings',
    occurredAt: '2026-08-23T19:00:00Z',
    createdAt: '2026-08-23T19:00:01Z',
}

afterEach(() => {
    vi.restoreAllMocks()
})

describe('transfersApi', () => {
    it('loads the transfer collection and one transfer', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(response([transfer]))
            .mockResolvedValueOnce(response(transfer))

        await expect(getTransfers()).resolves.toEqual([transfer])
        await expect(getTransfer('transfer-id')).resolves.toEqual(transfer)

        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            '/api/v1/transfers',
            expect.objectContaining({credentials: 'include'}),
        )
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            '/api/v1/transfers/transfer-id',
            expect.objectContaining({credentials: 'include'}),
        )
    })

    it('creates and reverses a transfer with the API contract', async () => {
        const reversal = {
            ...transfer,
            id: 'reversal-id',
            sourceAccountId: 'savings-id',
            destinationAccountId: 'checking-id',
            reversalOfTransferId: 'transfer-id',
        }
        const fetchMock = vi.spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(response(transfer, 201))
            .mockResolvedValueOnce(response(reversal, 201))
        const createRequest = {
            sourceAccountId: 'checking-id',
            destinationAccountId: 'savings-id',
            amount: 25.5,
            note: 'Move to savings',
            occurredAt: '2026-08-23T19:00:00.000Z',
        }
        const reverseRequest = {
            note: 'Undo transfer',
            occurredAt: '2026-08-23T20:00:00.000Z',
        }

        await expect(createTransfer(createRequest)).resolves.toEqual(transfer)
        await expect(reverseTransfer('transfer-id', reverseRequest))
            .resolves.toEqual(reversal)

        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            '/api/v1/transfers',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(createRequest),
            }),
        )
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            '/api/v1/transfers/transfer-id/reversal',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(reverseRequest),
            }),
        )
    })
})
