import {
    createRef,
} from 'react'
import {
    fireEvent,
    render,
    screen,
} from '@testing-library/react'
import {
    MemoryRouter,
} from 'react-router-dom'
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest'

import {
    MobileWorkspaceNavigation,
} from './MobileWorkspaceNavigation'

const renderNavigation = (
    isOpen = false,
    activePage:
        | 'dashboard'
        | 'accounts'
        | 'transactions'
        | 'budgets'
        | 'categories' = 'dashboard',
) => {
    const onToggleAccountMenu = vi.fn()
    const onOpenProfile = vi.fn()
    const onOpenSettings = vi.fn()
    const onSignOut = vi.fn(async () => undefined)

    const result = render(
        <MemoryRouter>
            <MobileWorkspaceNavigation
                activePage={activePage}
                displayName="Daniel C."
                initials="DC"
                profileAvailable
                profilePhotoSrc={null}
                isAccountMenuOpen={isOpen}
                isSigningOut={false}
                signOutError={null}
                accountMenuRef={createRef<HTMLDivElement>()}
                accountButtonRef={createRef<HTMLButtonElement>()}
                onToggleAccountMenu={onToggleAccountMenu}
                onOpenProfile={onOpenProfile}
                onOpenSettings={onOpenSettings}
                onSignOut={onSignOut}
            />
        </MemoryRouter>,
    )

    return {
        ...result,
        onOpenProfile,
        onOpenSettings,
        onSignOut,
        onToggleAccountMenu,
    }
}

describe('MobileWorkspaceNavigation', () => {
    it('keeps five primary slots and moves categories into More', () => {
        const {
            onToggleAccountMenu,
        } = renderNavigation()

        expect(screen.getAllByRole('link')).toHaveLength(4)
        expect(screen.queryByRole('link', {name: 'Categories'}))
            .not.toBeInTheDocument()

        const moreButton = screen.getByRole('button', {name: 'More'})
        expect(moreButton).toHaveAttribute('aria-expanded', 'false')

        fireEvent.click(moreButton)
        expect(onToggleAccountMenu).toHaveBeenCalledOnce()
    })

    it('shows overflow navigation and account actions inside the viewport menu', () => {
        const {
            onOpenProfile,
            onOpenSettings,
            onSignOut,
        } = renderNavigation(true, 'categories')

        expect(screen.getByRole('button', {name: 'More'}))
            .toHaveClass('active')
        expect(screen.getByRole('menuitem', {name: 'Categories'}))
            .toHaveAttribute('aria-current', 'page')
        expect(screen.getByText('Daniel C.')).toBeInTheDocument()

        fireEvent.click(screen.getByRole('menuitem', {name: 'Settings'}))
        expect(onOpenSettings).toHaveBeenCalledOnce()

        fireEvent.click(screen.getByRole('menuitem', {name: 'Profile'}))
        expect(onOpenProfile).toHaveBeenCalledOnce()

        fireEvent.click(screen.getByRole('menuitem', {name: 'Sign out'}))
        expect(onSignOut).toHaveBeenCalledOnce()
    })
})
