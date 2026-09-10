import {
    useState,
} from 'react'
import type {
    FormEvent,
} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../components/Icons'
import {ApiError} from '../../shared/api/ApiError'
import {
    deleteProfilePhoto,
    updateProfile,
    updateProfilePhoto,
    uploadProfilePhoto,
} from './api/profileApi'
import type {
    Profile,
} from './api/profileApi'
import {
    ProfilePersonalSection,
} from './components/ProfilePersonalSection'
import {
    ProfilePhotoSection,
} from './components/ProfilePhotoSection'
import {
    createProfileForm,
    isProfileFormDirty,
    normalizeProfileForm,
    toProfileFieldErrors,
    validateProfile,
} from './profileForm'
import type {
    ProfileField,
    ProfileFieldErrors,
    ProfileForm,
} from './profileForm'
import {
    createProfilePhotoSrc,
    validateProfilePhoto,
} from './profilePhoto'
import {useRef} from 'react'
import {
    useModalAccessibility,
} from '../../shared/hooks/useModalAccessibility'
import './ProfileModal.css'

type ProfileModalProps = {
    profile: Profile
    profilePhotoRevision: number
    onClose: () => void
    onProfileChange: (
        profile: Profile,
    ) => void
    onProfilePhotoChange: () => void
    restoreFocus?: () => void
}

export function ProfileModal({
                                 profile,
                                 profilePhotoRevision,
                                 onClose,
                                 onProfileChange,
                                 onProfilePhotoChange,
                                 restoreFocus,
                             }: ProfileModalProps) {
    const {t} = useTranslation()
    const [values, setValues] =
        useState<ProfileForm>(
            createProfileForm(profile),
        )
    const [errors, setErrors] = useState<ProfileFieldErrors>({})
    const [notice, setNotice] = useState<string | null>(null)
    const [isSaving, setSaving] = useState(false)
    const [isPhotoBusy, setPhotoBusy] = useState(false)


    const isBusy =
        isSaving || isPhotoBusy

    const closeButtonRef =
        useRef<HTMLButtonElement>(null)

    const dialogRef =
        useModalAccessibility({
            canClose: !isBusy,
            initialFocusRef:
            closeButtonRef,
            onClose,
            restoreFocus,
        })

    const isDirty =
        isProfileFormDirty(
            values,
            profile,
        )

    const photoSrc =
        createProfilePhotoSrc(
            profile.photoUrl,
            profilePhotoRevision,
        )

    const updateField = (
        field: ProfileField,
        value: string,
    ) => {
        setValues((current) => ({
            ...current,
            [field]: value,
        }))

        setErrors((current) => ({
            ...current,
            [field]: undefined,
        }))

        setNotice(null)
    }

    const handleSubmit = async (
        event:
        FormEvent<HTMLFormElement>,
    ): Promise<void> => {
        event.preventDefault()

        if (!isDirty || isBusy) {
            return
        }

        const validationErrors =
            validateProfile(values)

        if (
            Object.keys(
                validationErrors,
            ).length > 0
        ) {
            setErrors(
                validationErrors,
            )

            return
        }

        setSaving(true)
        setErrors({})
        setNotice(null)

        try {
            const updatedProfile =
                await updateProfile(
                    profile.id,
                    normalizeProfileForm(
                        values,
                    ),
                )

            onProfileChange(
                updatedProfile,
            )

            setValues(
                createProfileForm(
                    updatedProfile,
                ),
            )
        } catch (error) {
            if (
                error instanceof ApiError
            ) {
                setErrors(
                    toProfileFieldErrors(
                        error.fieldErrors,
                    ),
                )

                setNotice(
                    error.message,
                )
            } else {
                setNotice(
                    t('profile.unexpectedError'),
                )
            }
        } finally {
            setSaving(false)
        }
    }

    const handlePhotoSelected =
        async (
            photo: File,
        ): Promise<void> => {
            if (isBusy) {
                return
            }

            const validationError =
                validateProfilePhoto(photo)

            if (validationError) {
                setNotice(
                    validationError,
                )

                return
            }

            setPhotoBusy(true)
            setNotice(null)

            try {
                const photoMeta =
                    profile.photoUrl
                        ? await updateProfilePhoto(
                            profile.id,
                            photo,
                        )
                        : await uploadProfilePhoto(
                            profile.id,
                            photo,
                        )

                onProfileChange({
                    ...profile,
                    photoUrl:
                    photoMeta.url,
                })

                onProfilePhotoChange()

            } catch (error) {
                setNotice(
                    error instanceof ApiError
                        ? error.message
                        : t('profile.photoSaveError'),
                )
            } finally {
                setPhotoBusy(false)
            }
        }

    const handleRemovePhoto =
        async (): Promise<void> => {
            if (
                !profile.photoUrl
                || isBusy
            ) {
                return
            }

            setPhotoBusy(true)
            setNotice(null)

            try {
                await deleteProfilePhoto(
                    profile.id,
                )

                onProfileChange({
                    ...profile,
                    photoUrl: undefined,
                })

                onProfilePhotoChange()
            } catch (error) {
                setNotice(
                    error instanceof ApiError
                        ? error.message
                        : t('profile.photoRemoveError'),
                )
            } finally {
                setPhotoBusy(false)
            }
        }

    return (
        <div className="profile-editor-layer">
            <div
                className="profile-editor-backdrop"
                aria-hidden="true"
            />

            <section
                ref={dialogRef}
                className="profile-editor"
                role="dialog"
                aria-modal="true"
                aria-labelledby="profile-editor-title"
                aria-describedby="profile-editor-description"
                tabIndex={-1}
            >
                <header className="profile-editor-header">
                    <div>
                        <h2 id="profile-editor-title">
                            {t('profile.title')}
                        </h2>

                        <p id="profile-editor-description">
                            {t('profile.description')}
                        </p>
                    </div>

                    <button
                        ref={closeButtonRef}
                        type="button"
                        className="profile-editor-close"
                        aria-label={t('profile.close')}
                        disabled={isBusy}
                        onClick={onClose}
                    >
                        <Icon name="close"/>
                    </button>
                </header>

                <form
                    onSubmit={handleSubmit}
                    noValidate
                >
                    <div className="profile-editor-body">
                        <ProfilePhotoSection
                            profile={profile}
                            photoSrc={photoSrc}
                            disabled={isBusy}
                            onPhotoSelected={
                                handlePhotoSelected
                            }
                            onRemovePhoto={
                                handleRemovePhoto
                            }
                        />

                        <ProfilePersonalSection
                            values={values}
                            errors={errors}
                            notice={notice}
                            disabled={isBusy}
                            onChange={
                                updateField
                            }
                        />
                    </div>

                    <footer className="profile-editor-footer">
                        <span>
                            {isDirty
                                ? t('profile.unsaved')
                                : t('profile.saved')}
                        </span>

                        <div>
                            <button
                                type="button"
                                className="secondary"
                                disabled={isBusy}
                                onClick={onClose}
                            >
                                {t('profile.cancel')}
                            </button>

                            <button
                                type="submit"
                                className="primary"
                                disabled={
                                    isBusy
                                    || !isDirty
                                }
                            >
                                {isSaving
                                    ? t('profile.saving')
                                    : t('profile.save')}
                            </button>
                        </div>
                    </footer>
                </form>
            </section>
        </div>
    )
}
