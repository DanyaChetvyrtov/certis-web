import type {RefObject} from 'react'
import {useTranslation} from 'react-i18next'
import {Link} from 'react-router-dom'
import {Icon} from '../../../components/Icons'
import {
    mobileOverflowItems,
    mobilePrimaryItems,
    navigationDestination,
} from '../model/navigation'
import type {ActiveWorkspacePage} from '../model/navigation'
import './MobileWorkspaceNavigation.css'

type MobileWorkspaceNavigationProps = {
    activePage: ActiveWorkspacePage
    transactionsDestination: string
    displayName: string
    initials: string
    profileAvailable: boolean
    profilePhotoSrc: string | null
    isAccountMenuOpen: boolean
    isSigningOut: boolean
    signOutError: string | null
    accountMenuRef: RefObject<HTMLDivElement | null>
    accountButtonRef: RefObject<HTMLButtonElement | null>
    onToggleAccountMenu: () => void
    onOpenProfile: () => void
    onOpenSettings: () => void
    onSignOut: () => Promise<void>
}

export function MobileWorkspaceNavigation({
    activePage,
    transactionsDestination,
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
    const {t} = useTranslation()

    return (
        <nav
            className="workspace-mobile-navigation"
            aria-label={t('navigation.mobileNavigation')}
        >
            {mobilePrimaryItems.map((item) => (
                <Link
                    key={item.page}
                    className={activePage === item.page ? 'active' : undefined}
                    to={navigationDestination(item, transactionsDestination)}
                    aria-label={t(item.labelKey)}
                    aria-current={activePage === item.page ? 'page' : undefined}
                >
                    <Icon name={item.icon}/>
                </Link>
            ))}

            <div ref={accountMenuRef} className="workspace-mobile-more">
                <button
                    ref={accountButtonRef}
                    className={
                        activePage === 'categories'
                        || activePage === 'goals'
                        || isAccountMenuOpen
                            ? 'workspace-mobile-more-trigger active'
                            : 'workspace-mobile-more-trigger'
                    }
                    type="button"
                    aria-label={t('navigation.more')}
                    aria-haspopup="menu"
                    aria-expanded={isAccountMenuOpen}
                    aria-controls="workspace-mobile-more-menu"
                    onClick={onToggleAccountMenu}
                >
                    <Icon name="more"/>
                </button>

                {isAccountMenuOpen && (
                    <div
                        id="workspace-mobile-more-menu"
                        className="workspace-account-menu workspace-mobile-more-menu"
                        role="menu"
                    >
                        {mobileOverflowItems.map((item) => (
                            <Link
                                key={item.page}
                                className={activePage === item.page
                                    ? 'workspace-mobile-overflow-link active'
                                    : 'workspace-mobile-overflow-link'}
                                to={navigationDestination(item, transactionsDestination)}
                                role="menuitem"
                                aria-current={activePage === item.page ? 'page' : undefined}
                            >
                                <span className="workspace-account-menu-label">
                                    <Icon name={item.icon}/>
                                    <span>{t(item.labelKey)}</span>
                                </span>
                                <Icon name="chevron-right"/>
                            </Link>
                        ))}

                        <button
                            className="workspace-mobile-overflow-link"
                            type="button"
                            role="menuitem"
                            onClick={onOpenSettings}
                        >
                            <span className="workspace-account-menu-label">
                                <Icon name="settings"/>
                                <span>{t('navigation.settings')}</span>
                            </span>
                            <Icon name="chevron-right"/>
                        </button>

                        <div className="workspace-account-menu-divider" aria-hidden="true"/>

                        <div className="workspace-mobile-profile-summary">
                            <span className="workspace-mobile-avatar" aria-hidden="true">
                                {profilePhotoSrc
                                    ? <img src={profilePhotoSrc} alt=""/>
                                    : initials}
                            </span>
                            <div>
                                <strong>{displayName}</strong>
                                <small>{t('navigation.certisAccount')}</small>
                            </div>
                        </div>

                        {profileAvailable && (
                            <>
                                <button
                                    type="button"
                                    role="menuitem"
                                    className="workspace-account-menu-profile"
                                    onClick={onOpenProfile}
                                >
                                    <span className="workspace-account-menu-label">
                                        <Icon name="user"/>
                                        <span>{t('navigation.profile')}</span>
                                    </span>
                                    <Icon name="chevron-right"/>
                                </button>
                                <div className="workspace-account-menu-divider" aria-hidden="true"/>
                            </>
                        )}

                        <button
                            type="button"
                            role="menuitem"
                            className="workspace-account-menu-sign-out"
                            disabled={isSigningOut}
                            onClick={() => void onSignOut()}
                        >
                            <span>{isSigningOut
                                ? t('navigation.signingOut')
                                : t('navigation.signOut')}</span>
                            {isSigningOut
                                ? <span className="workspace-sign-out-spinner" aria-hidden="true"/>
                                : <Icon name="arrow-right"/>}
                        </button>

                        {signOutError && (
                            <p className="workspace-sign-out-error" role="alert">
                                {signOutError}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </nav>
    )
}
