import type {
    RefObject,
} from 'react'
import {
    Link,
} from 'react-router-dom'
import {
    Icon,
} from '../components/Icons'
import './MobileWorkspaceNavigation.css'

type ActivePage =
    | 'dashboard'
    | 'accounts'
    | 'transactions'
    | 'budgets'
    | 'categories'

type MobileWorkspaceNavigationProps = {
    activePage: ActivePage
    displayName: string
    initials: string
    profileAvailable: boolean
    profilePhotoSrc: string | null

    isAccountMenuOpen: boolean
    isSigningOut: boolean
    signOutError: string | null

    accountMenuRef:
        RefObject<HTMLDivElement | null>

    accountButtonRef:
        RefObject<HTMLButtonElement | null>

    onToggleAccountMenu: () => void
    onOpenProfile: () => void
    onOpenSettings: () => void
    onSignOut: () => Promise<void>
}

export function MobileWorkspaceNavigation({
                                              activePage,
                                              displayName,
                                              initials,
                                              profileAvailable,
                                              profilePhotoSrc,
                                              isAccountMenuOpen,
                                              isSigningOut,
                                              signOutError,
                                              accountMenuRef,
                                              accountButtonRef,
                                              onToggleAccountMenu,
                                              onOpenProfile,
                                              onOpenSettings,
                                              onSignOut,
                                          }: MobileWorkspaceNavigationProps) {
    return (
        <nav
            className="workspace-mobile-navigation"
            aria-label="Mobile workspace navigation"
        >
            <Link
                className={
                    activePage === 'dashboard'
                        ? 'active'
                        : undefined
                }
                to="/dashboard"
                aria-label="Dashboard"
                aria-current={
                    activePage === 'dashboard'
                        ? 'page'
                        : undefined
                }
            >
                <Icon name="dashboard"/>
            </Link>

            <Link
                className={
                    activePage === 'accounts'
                        ? 'active'
                        : undefined
                }
                to="/accounts"
                aria-label="Accounts"
                aria-current={
                    activePage === 'accounts'
                        ? 'page'
                        : undefined
                }
            >
                <Icon name="wallet"/>
            </Link>

            <Link
                className={
                    activePage === 'transactions'
                        ? 'active'
                        : undefined
                }
                to="/transactions"
                aria-label="Transactions"
                aria-current={
                    activePage === 'transactions'
                        ? 'page'
                        : undefined
                }
            >
                <Icon name="receipt"/>
            </Link>

            <Link
                className={
                    activePage === 'budgets'
                        ? 'active'
                        : undefined
                }
                to="/budgets"
                aria-label="Budgets"
                aria-current={
                    activePage === 'budgets'
                        ? 'page'
                        : undefined
                }
            >
                <Icon name="gauge"/>
            </Link>

            <div
                ref={accountMenuRef}
                className="workspace-mobile-more"
            >
                <button
                    ref={accountButtonRef}
                    className={
                        activePage === 'categories'
                        || isAccountMenuOpen
                            ? 'workspace-mobile-more-trigger active'
                            : 'workspace-mobile-more-trigger'
                    }
                    type="button"
                    aria-label="More"
                    aria-haspopup="menu"
                    aria-expanded={
                        isAccountMenuOpen
                    }
                    aria-controls="workspace-mobile-more-menu"
                    onClick={
                        onToggleAccountMenu
                    }
                >
                    <Icon name="more"/>
                </button>

                {isAccountMenuOpen && (
                    <div
                        id="workspace-mobile-more-menu"
                        className="
                            workspace-account-menu
                            workspace-mobile-more-menu
                        "
                        role="menu"
                    >
                        <Link
                            className={
                                activePage === 'categories'
                                    ? 'workspace-mobile-overflow-link active'
                                    : 'workspace-mobile-overflow-link'
                            }
                            to="/categories"
                            role="menuitem"
                            aria-current={
                                activePage === 'categories'
                                    ? 'page'
                                    : undefined
                            }
                        >
                            <span className="workspace-account-menu-label">
                                <Icon name="tag"/>
                                <span>Categories</span>
                            </span>
                            <Icon name="chevron-right"/>
                        </Link>

                        <button
                            className="workspace-mobile-overflow-link"
                            type="button"
                            role="menuitem"
                            onClick={onOpenSettings}
                        >
                            <span className="workspace-account-menu-label">
                                <Icon name="settings"/>
                                <span>Settings</span>
                            </span>
                            <Icon name="chevron-right"/>
                        </button>

                        <div
                            className="workspace-account-menu-divider"
                            aria-hidden="true"
                        />

                        <div className="workspace-mobile-profile-summary">
                            <span
                                className="workspace-mobile-avatar"
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

                            <div>
                                <strong>{displayName}</strong>
                                <small>Certis account</small>
                            </div>
                        </div>

                        {profileAvailable && (
                            <>
                                <button
                                    type="button"
                                    role="menuitem"
                                    className="workspace-account-menu-profile"
                                    onClick={
                                        onOpenProfile
                                    }
                                >
                                    <span className="workspace-account-menu-label">
                                        <Icon name="user"/>

                                        <span>
                                            Profile
                                        </span>
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
                            disabled={
                                isSigningOut
                            }
                            onClick={() =>
                                void onSignOut()
                            }
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
        </nav>
    )
}
