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

            <div
                ref={accountMenuRef}
                className="workspace-mobile-account"
            >
                <button
                    ref={accountButtonRef}
                    className="workspace-mobile-account-trigger"
                    type="button"
                    aria-label="Account menu"
                    aria-haspopup="menu"
                    aria-expanded={
                        isAccountMenuOpen
                    }
                    aria-controls="workspace-mobile-account-menu"
                    onClick={
                        onToggleAccountMenu
                    }
                >
                    <span
                        className="workspace-mobile-avatar"
                        aria-hidden="true"
                    >
                        {profilePhotoSrc
                            ? (
                                <img
                                    src={
                                        profilePhotoSrc
                                    }
                                    alt=""
                                />
                            )
                            : initials}
                    </span>
                </button>

                {isAccountMenuOpen && (
                    <div
                        id="workspace-mobile-account-menu"
                        className="
                            workspace-account-menu
                            workspace-mobile-account-menu
                        "
                        role="menu"
                    >
                        <div className="workspace-account-menu-header">
                            <strong>
                                {displayName}
                            </strong>

                            <small>
                                Certis account
                            </small>
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