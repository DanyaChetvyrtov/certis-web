import {ProfileModal} from '../../../features/profile/ProfileModal'
import {SettingsModal} from '../../../features/settings/SettingsModal'
import type {ActiveWorkspacePage} from '../model/navigation'
import {useWorkspaceShell} from '../model/useWorkspaceShell'
import {DesktopWorkspaceNavigation} from './DesktopWorkspaceNavigation'
import {MobileWorkspaceNavigation} from './MobileWorkspaceNavigation'

export type WorkspaceSidebarProps = {
    activePage: ActiveWorkspacePage
    activeAccounts?: number
}

export function WorkspaceSidebar({
    activePage,
    activeAccounts = 0,
}: WorkspaceSidebarProps) {
    const shell = useWorkspaceShell()

    return (
        <>
            <DesktopWorkspaceNavigation
                activePage={activePage}
                activeAccounts={activeAccounts}
                transactionsDestination={shell.transactionsDestination}
                displayName={shell.displayName}
                initials={shell.initials}
                profileAvailable={Boolean(shell.profile)}
                profilePhotoSrc={shell.profilePhotoSrc}
                isAccountMenuOpen={shell.isAccountMenuOpen}
                isSigningOut={shell.isSigningOut}
                signOutError={shell.signOutError}
                accountMenuRef={shell.accountMenuRef}
                accountButtonRef={shell.accountButtonRef}
                settingsButtonRef={shell.settingsButtonRef}
                onToggleAccountMenu={shell.toggleAccountMenu}
                onOpenProfile={() => shell.openProfileModal(shell.accountButtonRef.current)}
                onOpenSettings={() => shell.openSettingsModal(shell.settingsButtonRef.current)}
                onSignOut={shell.handleSignOut}
            />
            <MobileWorkspaceNavigation
                activePage={activePage}
                transactionsDestination={shell.transactionsDestination}
                displayName={shell.displayName}
                initials={shell.initials}
                profileAvailable={Boolean(shell.profile)}
                profilePhotoSrc={shell.profilePhotoSrc}
                isAccountMenuOpen={shell.isAccountMenuOpen}
                isSigningOut={shell.isSigningOut}
                signOutError={shell.signOutError}
                accountMenuRef={shell.mobileAccountMenuRef}
                accountButtonRef={shell.mobileAccountButtonRef}
                onToggleAccountMenu={shell.toggleAccountMenu}
                onOpenProfile={() => shell.openProfileModal(shell.mobileAccountButtonRef.current)}
                onOpenSettings={() => shell.openSettingsModal(shell.mobileAccountButtonRef.current)}
                onSignOut={shell.handleSignOut}
            />
            {shell.isProfileModalOpen && shell.profile && (
                <ProfileModal
                    profile={shell.profile}
                    profilePhotoRevision={shell.profilePhotoRevision}
                    onProfileChange={shell.setProfile}
                    onProfilePhotoChange={shell.refreshProfilePhoto}
                    onClose={shell.closeProfileModal}
                    restoreFocus={() => shell.profileRestoreFocusRef.current?.focus()}
                />
            )}
            {shell.isSettingsModalOpen && (
                <SettingsModal
                    onClose={shell.closeSettingsModal}
                    restoreFocus={() => shell.settingsRestoreFocusRef.current?.focus()}
                />
            )}
        </>
    )
}
