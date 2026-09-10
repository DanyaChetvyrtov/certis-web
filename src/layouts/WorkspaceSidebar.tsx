import {
    useEffect,
    useRef,
    useState,
} from 'react'
import {useTranslation} from 'react-i18next'
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
import {
    SettingsModal,
} from '../features/settings/SettingsModal'

type WorkspaceSidebarProps = {
    activePage:
        | 'dashboard'
        | 'accounts'
        | 'transactions'
        | 'budgets'
        | 'goals'
        | 'categories'
    activeAccounts?: number
}

export function WorkspaceSidebar({
                                     activePage,
                                     activeAccounts = 0,
                                 }: WorkspaceSidebarProps) {
    const {t} = useTranslation()
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

    const [
        isSettingsModalOpen,
        setSettingsModalOpen,
    ] = useState(false)

    const openProfileModal = (
        restoreFocusTarget:
            HTMLElement | null,
    ) => {
        profileRestoreFocusRef.current =
            restoreFocusTarget

        setAccountMenuOpen(false)
        setSignOutError(null)
        setSettingsModalOpen(false)
        setProfileModalOpen(true)
    }

    const openSettingsModal = (
        restoreFocusTarget:
            HTMLElement | null,
    ) => {
        settingsRestoreFocusRef.current =
            restoreFocusTarget

        setAccountMenuOpen(false)
        setSignOutError(null)
        setProfileModalOpen(false)
        setSettingsModalOpen(true)
    }

    const [isAccountMenuOpen, setAccountMenuOpen] = useState(false)
    const [isSigningOut, setSigningOut] = useState(false)
    const [signOutError, setSignOutError] = useState<string | null>(null)
    const accountMenuRef = useRef<HTMLDivElement>(null)
    const accountButtonRef = useRef<HTMLButtonElement>(null)
    const settingsButtonRef = useRef<HTMLButtonElement>(null)

    const mobileAccountMenuRef = useRef<HTMLDivElement>(null)
    const mobileAccountButtonRef = useRef<HTMLButtonElement>(null)
    const profileRestoreFocusRef = useRef<HTMLElement | null>(null)
    const settingsRestoreFocusRef = useRef<HTMLElement | null>(null)

    const displayName = profile
        ? `${profile.name} ${profile.surname.charAt(0)}.`
        : t('navigation.personalWorkspace')

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
            setSignOutError(
                error instanceof ApiError
                    ? error.message
                    : t('navigation.signOutError'),
            )
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
                    aria-label={t('navigation.dashboardLabel')}
                >
                    <CertisLogo className="workspace-logo"/>
                </Link>

                <nav
                    className="workspace-navigation"
                    aria-label={t('navigation.workspaceNavigation')}
                >
                    <p>{t('navigation.workspace')}</p>

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
                        <span>{t('navigation.dashboard')}</span>
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
                        <span>{t('navigation.accounts')}</span>
                    </Link>

                    <Link
                        className={
                            activePage === 'transactions'
                                ? 'active'
                                : undefined
                        }
                        to="/transactions"
                        aria-current={
                            activePage === 'transactions'
                                ? 'page'
                                : undefined
                        }
                    >
                        <Icon name="receipt"/>
                        <span>{t('navigation.transactions')}</span>
                    </Link>

                    <Link
                        className={
                            activePage === 'budgets'
                                ? 'active'
                                : undefined
                        }
                        to="/budgets"
                        aria-current={
                            activePage === 'budgets'
                                ? 'page'
                                : undefined
                        }
                    >
                        <Icon name="gauge"/>
                        <span>{t('navigation.budgets')}</span>
                    </Link>

                    <Link
                        className={
                            activePage === 'goals'
                                ? 'active'
                                : undefined
                        }
                        to="/goals"
                        aria-current={
                            activePage === 'goals'
                                ? 'page'
                                : undefined
                        }
                    >
                        <Icon name="target"/>
                        <span>{t('navigation.goals')}</span>
                    </Link>

                    <Link
                        className={
                            activePage === 'categories'
                                ? 'active'
                                : undefined
                        }
                        to="/categories"
                        aria-current={
                            activePage === 'categories'
                                ? 'page'
                                : undefined
                        }
                    >
                        <Icon name="tag"/>
                        <span>{t('navigation.categories')}</span>
                    </Link>
                </nav>

                <div className="workspace-sidebar-spacer"/>

                <section
                    className="workspace-insight"
                    aria-label={t('navigation.overviewLabel')}
                >
                <span>
                    <Icon name="piggy-bank"/>
                </span>

                    <strong>{t('navigation.overviewTitle')}</strong>

                    <p>
                        {activeAccounts === 0
                            ? t('navigation.createFirstAccount')
                            : t('navigation.activeAccounts', {
                                count: activeAccounts,
                            })}
                    </p>
                </section>

                <button
                    ref={settingsButtonRef}
                    className="workspace-settings-link"
                    type="button"
                    onClick={() =>
                        openSettingsModal(
                            settingsButtonRef.current,
                        )
                    }
                >
                <Icon name="settings"/>
                <span>{t('navigation.settings')}</span>
            </button>

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
                        <small>{t('navigation.personalWorkspace')}</small>
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
                                <small>{t('navigation.certisAccount')}</small>
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
                                    <span>{t('navigation.profile')}</span>
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
                                    ? t('navigation.signingOut')
                                    : t('navigation.signOut')}
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
                onOpenSettings={() =>
                    openSettingsModal(
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

            {isSettingsModalOpen && (
                <SettingsModal
                    onClose={() =>
                        setSettingsModalOpen(false)
                    }
                    restoreFocus={() =>
                        settingsRestoreFocusRef.current
                            ?.focus()
                    }
                />
            )}
        </>
    )
}
