import {
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react'
import {http, HttpResponse} from 'msw'
import {describe, expect, it, vi} from 'vitest'
import {server} from '../../test/server'
import {ProfileSetupModal} from './ProfileSetupModal'

const profile = {
    id: 'profile-id',
    name: 'Daniel',
    surname: 'Carter',
    dateOfBirth: '2000-01-01',
    preferredCurrency: 'RUB' as const,
}

const fillRequiredFields = () => {
    fireEvent.change(
        screen.getByLabelText('First name'),
        {target: {value: profile.name}},
    )
    fireEvent.change(
        screen.getByLabelText('Last name'),
        {target: {value: profile.surname}},
    )
    fireEvent.change(
        screen.getByLabelText('Date of birth'),
        {target: {value: profile.dateOfBirth}},
    )
}

describe('ProfileSetupModal', () => {
    it('sends the selected preferred currency', async () => {
        let requestBody: unknown
        const onComplete = vi.fn()

        server.use(
            http.post('/api/v1/profiles', async ({request}) => {
                requestBody = await request.json()
                return HttpResponse.json(
                    {...profile, preferredCurrency: 'EUR'},
                    {status: 201},
                )
            }),
        )

        render(
            <ProfileSetupModal
                onComplete={onComplete}
                onSignOut={vi.fn()}
            />,
        )

        fillRequiredFields()
        fireEvent.change(
            screen.getByLabelText('Preferred currency'),
            {target: {value: 'EUR'}},
        )
        fireEvent.click(
            screen.getByRole('button', {name: 'Open my dashboard'}),
        )

        await waitFor(() => expect(onComplete).toHaveBeenCalledOnce())
        expect(requestBody).toEqual({
            name: profile.name,
            surname: profile.surname,
            dateOfBirth: profile.dateOfBirth,
            preferredCurrency: 'EUR',
        })
    })

    it('omits preferred currency when the server default is selected', async () => {
        let requestBody: unknown
        const onComplete = vi.fn()

        server.use(
            http.post('/api/v1/profiles', async ({request}) => {
                requestBody = await request.json()
                return HttpResponse.json(profile, {status: 201})
            }),
        )

        render(
            <ProfileSetupModal
                onComplete={onComplete}
                onSignOut={vi.fn()}
            />,
        )

        fillRequiredFields()
        fireEvent.click(
            screen.getByRole('button', {name: 'Open my dashboard'}),
        )

        await waitFor(() => expect(onComplete).toHaveBeenCalledOnce())
        expect(requestBody).toEqual({
            name: profile.name,
            surname: profile.surname,
            dateOfBirth: profile.dateOfBirth,
        })
    })
})
