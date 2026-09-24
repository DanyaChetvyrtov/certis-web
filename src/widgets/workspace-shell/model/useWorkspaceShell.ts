import {useEffect, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {useNavigate} from 'react-router-dom'
import {useSession} from '../../../features/auth/session/SessionContext'
import {
    clearTransactionsDestination,
    getTransactionsDestination,
} from '../../../features/transaction-navigation'
import {createProfilePhotoSrc} from '../../../features/profile/profilePhoto'
import {ApiError} from '../../../shared/api/ApiError'

export function useWorkspaceShell() {
    const {t} = useTranslation()
    const navigate = useNavigate()
    const {
        profile,
        profilePhotoRevision,
        refreshProfilePhoto,
        setProfile,
        signOut,
    } = useSession()

    const [isProfileModalOpen, setProfileModalOpen] = useState(false)
    const [isSettingsModalOpen, setSettingsModalOpen] = useState(false)
    const [isAccountMenuOpen, setAccountMenuOpen] = useState(false)
    const [isSigningOut, setSigningOut] = useState(false)
    const [signOutError, setSignOutError] = useState<string | null>(null)
    const signOutInFlightRef = useRef(false)
    const accountMenuRef = useRef<HTMLDivElement>(null)
    const accountButtonRef = useRef<HTMLButtonElement>(null)
    const settingsButtonRef = useRef<HTMLButtonElement>(null)
    const mobileAccountMenuRef = useRef<HTMLDivElement>(null)
    const mobileAccountButtonRef = useRef<HTMLButtonElement>(null)
    const profileRestoreFocusRef = useRef<HTMLElement | null>(null)
    const settingsRestoreFocusRef = useRef<HTMLElement | null>(null)

    const transactionsDestination = getTransactionsDestination(profile?.id)
    const displayName = profile
        ? `${profile.name} ${profile.surname.charAt(0)}.`
        : t('navigation.personalWorkspace')
    const initials = profile
        ? `${profile.name.charAt(0)}${profile.surname.charAt(0)}`.toUpperCase()
        : 'C'
    const profilePhotoSrc = createProfilePhotoSrc(profile?.photoUrl, profilePhotoRevision)

    const openProfileModal = (restoreFocusTarget: HTMLElement | null) => {
        profileRestoreFocusRef.current = restoreFocusTarget
        setAccountMenuOpen(false)
        setSignOutError(null)
        setSettingsModalOpen(false)
        setProfileModalOpen(true)
    }

    const openSettingsModal = (restoreFocusTarget: HTMLElement | null) => {
        settingsRestoreFocusRef.current = restoreFocusTarget
        setAccountMenuOpen(false)
        setSignOutError(null)
        setProfileModalOpen(false)
        setSettingsModalOpen(true)
    }

    useEffect(() => {
        if (!isAccountMenuOpen) return

        const closeOnOutsideClick = (event: PointerEvent) => {
            const target = event.target
            if (!(target instanceof Node)) return
            const isDesktopMenu = accountMenuRef.current?.contains(target) ?? false
            const isMobileMenu = mobileAccountMenuRef.current?.contains(target) ?? false
            if (!isDesktopMenu && !isMobileMenu) {
                setAccountMenuOpen(false)
                setSignOutError(null)
            }
        }
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setAccountMenuOpen(false)
                setSignOutError(null)
            }
        }
        document.addEventListener('pointerdown', closeOnOutsideClick)
        window.addEventListener('keydown', closeOnEscape)
        return () => {
            document.removeEventListener('pointerdown', closeOnOutsideClick)
            window.removeEventListener('keydown', closeOnEscape)
        }
    }, [isAccountMenuOpen])

    const toggleAccountMenu = () => {
        setAccountMenuOpen((current) => !current)
        setSignOutError(null)
    }

    const handleSignOut = async (): Promise<void> => {
        if (signOutInFlightRef.current) return
        signOutInFlightRef.current = true
        setSigningOut(true)
        setSignOutError(null)
        try {
            await signOut()
            clearTransactionsDestination(profile?.id)
            navigate('/', {replace: true})
        } catch (error) {
            setSignOutError(error instanceof ApiError
                ? error.message
                : t('navigation.signOutError'))
        } finally {
            signOutInFlightRef.current = false
            setSigningOut(false)
        }
    }

    return {
        profile,
        profilePhotoRevision,
        refreshProfilePhoto,
        setProfile,
        transactionsDestination,
        displayName,
        initials,
        profilePhotoSrc,
        isProfileModalOpen,
        isSettingsModalOpen,
        isAccountMenuOpen,
        isSigningOut,
        signOutError,
        accountMenuRef,
        accountButtonRef,
        settingsButtonRef,
        mobileAccountMenuRef,
        mobileAccountButtonRef,
        profileRestoreFocusRef,
        settingsRestoreFocusRef,
        openProfileModal,
        openSettingsModal,
        closeProfileModal: () => setProfileModalOpen(false),
        closeSettingsModal: () => setSettingsModalOpen(false),
        toggleAccountMenu,
        handleSignOut,
    }
}

export type WorkspaceShellModel = ReturnType<typeof useWorkspaceShell>
