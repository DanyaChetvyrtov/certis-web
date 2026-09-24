import type {RefObject} from 'react'
import {useTranslation} from 'react-i18next'
import {Link} from 'react-router-dom'
import {CertisLogo, Icon} from '../../../components/Icons'
import {
    navigationDestination,
    navigationItems,
} from '../model/navigation'
import type {ActiveWorkspacePage} from '../model/navigation'
import './WorkspaceSidebar.css'

type DesktopWorkspaceNavigationProps = {
    activePage: ActiveWorkspacePage
    activeAccounts: number
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
    settingsButtonRef: RefObject<HTMLButtonElement | null>
    onToggleAccountMenu: () => void
    onOpenProfile: () => void
    onOpenSettings: () => void
    onSignOut: () => Promise<void>
}

export function DesktopWorkspaceNavigation({
    activePage,
    activeAccounts,
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
    settingsButtonRef,
    onToggleAccountMenu,
    onOpenProfile,
    onOpenSettings,
    onSignOut,
}: DesktopWorkspaceNavigationProps) {
    const {t} = useTranslation()

    return (
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
                {navigationItems.map((item) => (
                    <Link
                        key={item.page}
                        className={activePage === item.page ? 'active' : undefined}
                        to={navigationDestination(item, transactionsDestination)}
                        aria-current={activePage === item.page ? 'page' : undefined}
                    >
                        <Icon name={item.icon}/>
                        <span>{t(item.labelKey)}</span>
                    </Link>
                ))}
            </nav>

            <div className="workspace-sidebar-spacer"/>

            <section
                className="workspace-insight"
                aria-label={t('navigation.overviewLabel')}
            >
                <span><Icon name="piggy-bank"/></span>
                <strong>{t('navigation.overviewTitle')}</strong>
                <p>
                    {activeAccounts === 0
                        ? t('navigation.createFirstAccount')
                        : t('navigation.activeAccounts', {count: activeAccounts})}
                </p>
            </section>

            <button
                ref={settingsButtonRef}
                className="workspace-settings-link"
                type="button"
                onClick={onOpenSettings}
            >
                <Icon name="settings"/>
                <span>{t('navigation.settings')}</span>
            </button>

            <div className="workspace-person-menu" ref={accountMenuRef}>
                <button
                    ref={accountButtonRef}
                    className="workspace-person"
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={isAccountMenuOpen}
                    aria-controls="workspace-account-menu"
                    onClick={onToggleAccountMenu}
                >
                    <span className="workspace-avatar" aria-hidden="true">
                        {profilePhotoSrc
                            ? <img src={profilePhotoSrc} alt=""/>
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
                            onClick={() => void onSignOut()}
                        >
                            <span>
                                {isSigningOut
                                    ? t('navigation.signingOut')
                                    : t('navigation.signOut')}
                            </span>
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
        </aside>
    )
}
