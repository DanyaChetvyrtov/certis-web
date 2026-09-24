import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
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
} from '../../../features/transaction-navigation'
import {WorkspaceSidebar} from './WorkspaceSidebar'
import type {WorkspaceSidebarProps} from './WorkspaceSidebar'

const session = vi.hoisted(() => ({
    profileId: 'profile-1',
    signOut: vi.fn(async (): Promise<void> => undefined),
}))

vi.mock('../../../features/auth/session/SessionContext', () => ({
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
        signOut: session.signOut,
    }),
}))

vi.mock('../../../features/profile/ProfileModal', () => ({
    ProfileModal: ({onClose, restoreFocus}: {
        onClose: () => void
        restoreFocus: () => void
    }) => (
        <div role="dialog" aria-label="Profile dialog">
            <button type="button" onClick={() => { onClose(); restoreFocus() }}>
                Close profile
            </button>
        </div>
    ),
}))

vi.mock('../../../features/settings/SettingsModal', () => ({
    SettingsModal: ({onClose, restoreFocus}: {
        onClose: () => void
        restoreFocus: () => void
    }) => (
        <div role="dialog" aria-label="Settings dialog">
            <button type="button" onClick={() => { onClose(); restoreFocus() }}>
                Close settings
            </button>
        </div>
    ),
}))

function LocationProbe() {
    const location = useLocation()

    return <output data-testid="location">{location.pathname + location.search}</output>
}

const renderSidebar = ({activePage = 'dashboard', activeAccounts = 0}: Partial<WorkspaceSidebarProps> = {}) =>
    render(
        <MemoryRouter initialEntries={['/dashboard']}>
            <WorkspaceSidebar activePage={activePage} activeAccounts={activeAccounts}/>
            <LocationProbe/>
        </MemoryRouter>,
    )

beforeEach(() => {
    session.profileId = 'profile-1'
    session.signOut.mockReset()
    session.signOut.mockResolvedValue(undefined)
    window.sessionStorage.clear()
})

describe('WorkspaceSidebar navigation', () => {
    it('keeps desktop routes and the four primary mobile slots in order', () => {
        renderSidebar({activePage: 'goals', activeAccounts: 2})

        const desktop = screen.getByRole('navigation', {name: 'Workspace navigation'})
        const mobile = screen.getByRole('navigation', {name: 'Mobile workspace navigation'})
        expect(within(desktop).getAllByRole('link').map((link) => link.textContent)).toEqual([
            'Dashboard', 'Accounts', 'Transactions', 'Budgets', 'Goals', 'Categories',
        ])
        expect(within(mobile).getAllByRole('link').map((link) => link.getAttribute('aria-label')))
            .toEqual(['Dashboard', 'Accounts', 'Transactions', 'Budgets'])
        expect(within(desktop).getByRole('link', {name: 'Goals'}))
            .toHaveAttribute('aria-current', 'page')
        expect(screen.getByRole('button', {name: 'More'})).toHaveClass('active')
        expect(screen.getByText('2 active accounts are included in your overview.'))
            .toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', {name: 'More'}))
        const mobileMenu = document.getElementById('workspace-mobile-more-menu')!
        expect(screen.getAllByText('DC')).toHaveLength(2)
        expect(screen.getAllByText('Daniel C.')).toHaveLength(3)
        expect(within(mobileMenu).getAllByRole('menuitem').slice(0, 2).map((item) => item.textContent))
            .toEqual(['Goals', 'Categories'])
        expect(within(mobileMenu).getByRole('menuitem', {name: 'Goals'}))
            .toHaveAttribute('aria-current', 'page')
    })
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

describe('WorkspaceSidebar account actions', () => {
    it('closes the shared menu on Escape and outside pointer input', () => {
        renderSidebar()
        const trigger = screen.getByRole('button', {name: /Daniel C/})

        fireEvent.click(trigger)
        expect(screen.getAllByRole('menu')).toHaveLength(2)
        fireEvent.keyDown(window, {key: 'Escape'})
        expect(screen.queryByRole('menu')).not.toBeInTheDocument()

        fireEvent.click(trigger)
        fireEvent.pointerDown(document.body)
        expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('restores focus to the desktop and mobile profile triggers', () => {
        renderSidebar()
        const desktopTrigger = screen.getByRole('button', {name: /Daniel C/})
        fireEvent.click(desktopTrigger)
        fireEvent.click(within(document.getElementById('workspace-account-menu')!)
            .getByRole('menuitem', {name: 'Profile'}))
        expect(screen.getByRole('dialog', {name: 'Profile dialog'})).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', {name: 'Close profile'}))
        expect(desktopTrigger).toHaveFocus()

        const mobileTrigger = screen.getByRole('button', {name: 'More'})
        fireEvent.click(mobileTrigger)
        fireEvent.click(within(document.getElementById('workspace-mobile-more-menu')!)
            .getByRole('menuitem', {name: 'Profile'}))
        fireEvent.click(screen.getByRole('button', {name: 'Close profile'}))
        expect(mobileTrigger).toHaveFocus()
    })

    it('restores focus to the desktop and mobile settings triggers', () => {
        renderSidebar()
        const desktopTrigger = screen.getByRole('button', {name: 'Settings'})
        fireEvent.click(desktopTrigger)
        expect(screen.getByRole('dialog', {name: 'Settings dialog'})).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', {name: 'Close settings'}))
        expect(desktopTrigger).toHaveFocus()

        const mobileTrigger = screen.getByRole('button', {name: 'More'})
        fireEvent.click(mobileTrigger)
        fireEvent.click(within(document.getElementById('workspace-mobile-more-menu')!)
            .getByRole('menuitem', {name: 'Settings'}))
        fireEvent.click(screen.getByRole('button', {name: 'Close settings'}))
        expect(mobileTrigger).toHaveFocus()
    })

    it('keeps the remembered destination and shows feedback when sign-out fails', async () => {
        session.signOut.mockRejectedValue(new Error('offline'))
        rememberTransactionsDestination('profile-1', new URLSearchParams('q=private'))
        renderSidebar()

        fireEvent.click(screen.getByRole('button', {name: /Daniel C/}))
        fireEvent.click(within(document.getElementById('workspace-account-menu')!)
            .getByRole('menuitem', {name: 'Sign out'}))

        expect(await screen.findAllByRole('alert')).toHaveLength(2)
        expect(screen.getAllByRole('alert')[0])
            .toHaveTextContent('We could not sign you out. Please try again.')
        expect(window.sessionStorage.getItem('certis.transactions.lastUrl.profile-1'))
            .toBe('/transactions?q=private')
        expect(screen.getByTestId('location')).toHaveTextContent('/dashboard')
    })

    it('prevents duplicate sign-out submissions while the request is pending', async () => {
        let resolveSignOut: (() => void) | undefined
        session.signOut.mockImplementation(() => new Promise<void>((resolve) => {
            resolveSignOut = resolve
        }))
        renderSidebar()
        fireEvent.click(screen.getByRole('button', {name: /Daniel C/}))
        const signOut = within(document.getElementById('workspace-account-menu')!)
            .getByRole('menuitem', {name: 'Sign out'})

        act(() => {
            fireEvent.click(signOut)
            fireEvent.click(signOut)
        })
        expect(session.signOut).toHaveBeenCalledOnce()
        expect(signOut).toBeDisabled()

        await act(async () => resolveSignOut?.())
        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'))
    })
})
