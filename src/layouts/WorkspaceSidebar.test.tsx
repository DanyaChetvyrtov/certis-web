import {
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react'
import {
    MemoryRouter,
    useLocation,
} from 'react-router-dom'
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import {
    rememberTransactionsDestination,
} from '../app/transactionsDestination'
import {WorkspaceSidebar} from './WorkspaceSidebar'

const session = vi.hoisted(() => ({
    profileId: 'profile-1',
}))

vi.mock('../features/auth/session/SessionContext', () => ({
    useSession: () => ({
        profile: {
            id: session.profileId,
            name: 'Daniel',
            surname: 'Carter',
            dateOfBirth: '2000-01-01',
            preferredCurrency: 'RUB',
        },
        profilePhotoRevision: 0,
        refreshProfilePhoto: vi.fn(),
        setProfile: vi.fn(),
        signOut: async () => undefined,
    }),
}))

vi.mock('../features/profile/ProfileModal', () => ({
    ProfileModal: () => null,
}))

vi.mock('../features/settings/SettingsModal', () => ({
    SettingsModal: () => null,
}))

function LocationProbe() {
    const location = useLocation()

    return <output data-testid="location">{location.pathname + location.search}</output>
}

const renderSidebar = () =>
    render(
        <MemoryRouter initialEntries={['/dashboard']}>
            <WorkspaceSidebar activePage="dashboard"/>
            <LocationProbe/>
        </MemoryRouter>,
    )

beforeEach(() => {
    session.profileId = 'profile-1'
    window.sessionStorage.clear()
})

describe('WorkspaceSidebar Transactions destination', () => {
    it('uses the remembered address in desktop and mobile menus', () => {
        rememberTransactionsDestination(
            'profile-1',
            new URLSearchParams('period=all-time&q=rent'),
        )
        renderSidebar()

        const links = screen.getAllByRole('link', {name: 'Transactions'})

        expect(links).toHaveLength(2)
        links.forEach((link) => {
            expect(link).toHaveAttribute(
                'href',
                '/transactions?period=all-time&q=rent',
            )
        })

        fireEvent.click(links[0])
        expect(screen.getByTestId('location'))
            .toHaveTextContent('/transactions?period=all-time&q=rent')
    })

    it('does not use another profile’s remembered address', () => {
        rememberTransactionsDestination(
            'profile-1',
            new URLSearchParams('q=private'),
        )
        session.profileId = 'profile-2'
        renderSidebar()

        screen.getAllByRole('link', {name: 'Transactions'})
            .forEach((link) => {
                expect(link).toHaveAttribute('href', '/transactions')
            })
    })

    it('clears the current profile destination on successful sign-out', async () => {
        rememberTransactionsDestination(
            'profile-1',
            new URLSearchParams('q=private'),
        )
        renderSidebar()

        fireEvent.click(screen.getByRole('button', {name: /Daniel C/}))
        fireEvent.click(screen.getAllByRole('menuitem', {name: 'Sign out'})[0])

        await waitFor(() => {
            expect(window.sessionStorage.getItem(
                'certis.transactions.lastUrl.profile-1',
            )).toBeNull()
        })
    })
})
