import {
    useEffect,
    useRef,
    useState,
} from 'react'
import {
    Link,
    useNavigate,
} from 'react-router-dom'
import {
    CertisLogo,
    Icon,
} from '../components/Icons'
import {useSession} from '../features/auth/session/SessionContext'
import {ApiError} from '../shared/api/ApiError'
import './WorkspaceSidebar.css'
import {
    MobileWorkspaceNavigation,
} from './MobileWorkspaceNavigation'
import {ProfileModal} from '../features/profile/ProfileModal'
import {
    createProfilePhotoSrc,
} from '../features/profile/profilePhoto'

type WorkspaceSidebarProps = {
    activePage: 'dashboard' | 'accounts'
    activeAccounts?: number
}

const futureNavigation = [
    {
        label: 'Transactions',
        icon: 'receipt' as const,
    },
    {
        label: 'Budgets',
        icon: 'gauge' as const,
    },
    {
        label: 'Goals',
        icon: 'target' as const,
    },
    {
        label: 'Categories',
        icon: 'list' as const,
    },
]

const signOutErrorMessage = (error: unknown): string =>
    error instanceof ApiError
        ? error.message
        : 'We could not sign you out. Please try again.'

export function WorkspaceSidebar({
                                     activePage,
                                     activeAccounts = 0,
                                 }: WorkspaceSidebarProps) {
    const navigate = useNavigate()
    const {
        profile,
        profilePhotoRevision,
        refreshProfilePhoto,
        setProfile,
        signOut,
    } = useSession()

    const [
        isProfileModalOpen,
        setProfileModalOpen,
    ] = useState(false)

    const openProfileModal = (
        restoreFocusTarget:
            HTMLElement | null,
    ) => {
        profileRestoreFocusRef.current =
            restoreFocusTarget

        setAccountMenuOpen(false)
        setSignOutError(null)
        setProfileModalOpen(true)
    }

    const [isAccountMenuOpen, setAccountMenuOpen] = useState(false)
    const [isSigningOut, setSigningOut] = useState(false)
    const [signOutError, setSignOutError] = useState<string | null>(null)
    const accountMenuRef = useRef<HTMLDivElement>(null)
    const accountButtonRef = useRef<HTMLButtonElement>(null)

    const mobileAccountMenuRef = useRef<HTMLDivElement>(null)
    const mobileAccountButtonRef = useRef<HTMLButtonElement>(null)
    const profileRestoreFocusRef = useRef<HTMLElement | null>(null)

    const displayName = profile
        ? `${profile.name} ${profile.surname.charAt(0)}.`
        : 'Personal workspace'

    const initials = profile
        ? `${profile.name.charAt(0)}${profile.surname.charAt(0)}`
            .toUpperCase()
        : 'C'

    const profilePhotoSrc =
        createProfilePhotoSrc(
            profile?.photoUrl,
            profilePhotoRevision,
        )

    useEffect(() => {
        if (!isAccountMenuOpen) {
            return
        }

        const closeOnOutsideClick = (
            event: PointerEvent,
        ) => {
            const target = event.target

            if (!(target instanceof Node)) {
                return
            }

            const isDesktopMenu =
                accountMenuRef.current
                    ?.contains(target)
                ?? false

            const isMobileMenu =
                mobileAccountMenuRef.current
                    ?.contains(target)
                ?? false

            if (
                !isDesktopMenu
                && !isMobileMenu
            ) {
                setAccountMenuOpen(false)
                setSignOutError(null)
            }
        }

        const closeOnEscape = (
            event: KeyboardEvent,
        ) => {
            if (event.key === 'Escape') {
                setAccountMenuOpen(false)
                setSignOutError(null)
            }
        }

        document.addEventListener(
            'pointerdown',
            closeOnOutsideClick,
        )

        window.addEventListener(
            'keydown',
            closeOnEscape,
        )

        return () => {
            document.removeEventListener(
                'pointerdown',
                closeOnOutsideClick,
            )

            window.removeEventListener(
                'keydown',
                closeOnEscape,
            )
        }
    }, [isAccountMenuOpen])

    const toggleAccountMenu = () => {
        setAccountMenuOpen((current) => !current)
        setSignOutError(null)
    }

    const handleSignOut = async (): Promise<void> => {
        if (isSigningOut) {
            return
        }

        setSigningOut(true)
        setSignOutError(null)

        try {
            await signOut()
            navigate('/', {replace: true})
        } catch (error) {
            setSignOutError(signOutErrorMessage(error))
        } finally {
            setSigningOut(false)
        }
    }

    return (
        <>
            <aside className="workspace-sidebar">
                <Link
                    className="workspace-brand-link"
                    to="/dashboard"
                    aria-label="Certis dashboard"
                >
                    <CertisLogo className="workspace-logo"/>
                </Link>

                <nav
                    className="workspace-navigation"
                    aria-label="Workspace navigation"
                >
                    <p>Workspace</p>

                    <Link
                        className={
                            activePage === 'dashboard'
                                ? 'active'
                                : undefined
                        }
                        to="/dashboard"
                        aria-current={
                            activePage === 'dashboard'
                                ? 'page'
                                : undefined
                        }
                    >
                        <Icon name="dashboard"/>
                        <span>Dashboard</span>
                    </Link>

                    <Link
                        className={
                            activePage === 'accounts'
                                ? 'active'
                                : undefined
                        }
                        to="/accounts"
                        aria-current={
                            activePage === 'accounts'
                                ? 'page'
                                : undefined
                        }
                    >
                        <Icon name="wallet"/>
                        <span>Accounts</span>
                    </Link>

                    {futureNavigation.map((item) => (
                        <span
                            className="workspace-nav-disabled"
                            aria-disabled="true"
                            key={item.label}
                        >
                        <Icon name={item.icon}/>
                        <span>{item.label}</span>
                    </span>
                    ))}
                </nav>

                <div className="workspace-sidebar-spacer"/>

                <section
                    className="workspace-insight"
                    aria-label="Account overview"
                >
                <span>
                    <Icon name="piggy-bank"/>
                </span>

                    <strong>Your money, one place</strong>

                    <p>
                        {activeAccounts === 0
                            ? 'Create your first account to start tracking balances.'
                            : `${activeAccounts} active ${
                                activeAccounts === 1
                                    ? 'account is'
                                    : 'accounts are'
                            } included in your overview.`}
                    </p>
                </section>

                <span
                    className="workspace-settings-link"
                    aria-disabled="true"
                >
                <Icon name="settings"/>
                <span>Settings</span>
            </span>

                <div
                    className="workspace-person-menu"
                    ref={accountMenuRef}
                >
                    <button
                        ref={accountButtonRef}
                        className="workspace-person"
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={isAccountMenuOpen}
                        aria-controls="workspace-account-menu"
                        onClick={toggleAccountMenu}
                    >

                    <span
                        className="workspace-avatar"
                        aria-hidden="true"
                    >
                        {profilePhotoSrc
                            ? (
                                <img
                                    src={profilePhotoSrc}
                                    alt=""
                                />
                            )
                            : initials}
                    </span>

                        <span className="workspace-person-copy">
                        <strong>{displayName}</strong>
                        <small>Personal workspace</small>
                    </span>

                        <Icon name="chevron-down"/>
                    </button>

                    {isAccountMenuOpen && (
                        <div
                            id="workspace-account-menu"
                            className="workspace-account-menu"
                            role="menu"
                        >
                            <div className="workspace-account-menu-header">
                                <strong>{displayName}</strong>
                                <small>Certis account</small>
                            </div>

                            {profile && (
                                <>
                                    <button
                                        type="button"
                                        role="menuitem"
                                        className="workspace-account-menu-profile"
                                        onClick={() =>
                                            openProfileModal(
                                                accountButtonRef.current,
                                            )
                                        }
                                    >
                                <span className="workspace-account-menu-label">
                                    <Icon name="user"/>
                                    <span>Profile</span>
                                </span>

                                        <Icon name="chevron-right"/>
                                    </button>

                                    <div
                                        className="workspace-account-menu-divider"
                                        aria-hidden="true"
                                    />
                                </>
                            )}

                            <button
                                type="button"
                                role="menuitem"
                                className="workspace-account-menu-sign-out"
                                disabled={isSigningOut}
                                onClick={() => void handleSignOut()}
                            >
                            <span>
                                {isSigningOut
                                    ? 'Signing out…'
                                    : 'Sign out'}
                            </span>

                                {isSigningOut
                                    ? (
                                        <span
                                            className="workspace-sign-out-spinner"
                                            aria-hidden="true"
                                        />
                                    )
                                    : (
                                        <Icon name="arrow-right"/>
                                    )}
                            </button>

                            {signOutError && (
                                <p
                                    className="workspace-sign-out-error"
                                    role="alert"
                                >
                                    {signOutError}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </aside>

            <MobileWorkspaceNavigation
                activePage={activePage}
                displayName={displayName}
                initials={initials}
                profileAvailable={Boolean(profile)}
                profilePhotoSrc={profilePhotoSrc}
                isAccountMenuOpen={
                    isAccountMenuOpen
                }
                isSigningOut={isSigningOut}
                signOutError={signOutError}
                accountMenuRef={
                    mobileAccountMenuRef
                }
                accountButtonRef={
                    mobileAccountButtonRef
                }
                onToggleAccountMenu={
                    toggleAccountMenu
                }
                onOpenProfile={() =>
                    openProfileModal(
                        mobileAccountButtonRef.current,
                    )
                }
                onSignOut={handleSignOut}
            />

            {isProfileModalOpen && profile && (
                <ProfileModal
                    profile={profile}
                    profilePhotoRevision={
                        profilePhotoRevision
                    }
                    onProfileChange={setProfile}
                    onProfilePhotoChange={
                        refreshProfilePhoto
                    }
                    onClose={() =>
                        setProfileModalOpen(false)
                    }
                    restoreFocus={() =>
                        profileRestoreFocusRef.current
                            ?.focus()
                    }
                />)}
        </>
    )
}