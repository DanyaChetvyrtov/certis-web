import {useRef} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import type {Profile} from '../api/profileApi'
import {
    PROFILE_PHOTO_ACCEPT,
} from '../profilePhoto'

type ProfilePhotoSectionProps = {
    profile: Profile
    photoSrc: string | null
    disabled: boolean
    onPhotoSelected: (
        photo: File,
    ) => Promise<void>
    onRemovePhoto: () => Promise<void>
}

export function ProfilePhotoSection({
                                        profile,
                                        photoSrc,
                                        disabled,
                                        onPhotoSelected,
                                        onRemovePhoto,
                                    }: ProfilePhotoSectionProps) {
    const {t} = useTranslation()
    const photoInputRef =
        useRef<HTMLInputElement>(null)

    const initials =
        `${profile.name.charAt(0)}${profile.surname.charAt(0)}`
            .toUpperCase()

    return (
        <section className="profile-editor-section">
            <p className="profile-editor-eyebrow">
                {t('profile.photo')}
            </p>

            <div className="profile-editor-photo-row">
                <div className="profile-editor-avatar">
                    {photoSrc
                        ? (
                            <img
                                key={photoSrc}
                                src={photoSrc}
                                alt=""
                            />
                        )
                        : (
                            <span>
                                {initials}
                            </span>
                        )}
                </div>

                <div className="profile-editor-photo-content">
                    <strong>
                        {profile.name}{' '}
                        {profile.surname}
                    </strong>

                    <small>
                        {t('profile.profileLabel')}
                    </small>

                    <div className="profile-editor-photo-actions">
                        <input
                            ref={photoInputRef}
                            type="file"
                            accept={
                                PROFILE_PHOTO_ACCEPT
                            }
                            hidden
                            onChange={(event) => {
                                const photo =
                                    event.target
                                        .files?.[0]

                                event.target.value =
                                    ''

                                if (photo) {
                                    void onPhotoSelected(
                                        photo,
                                    )
                                }
                            }}
                        />

                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                                photoInputRef
                                    .current
                                    ?.click()
                            }
                        >
                            <Icon name="edit"/>

                            {profile.photoUrl
                                ? t('profile.changePhoto')
                                : t('profile.addPhoto')}
                        </button>

                        {profile.photoUrl && (
                            <button
                                type="button"
                                className="danger"
                                disabled={
                                    disabled
                                }
                                onClick={() =>
                                    void onRemovePhoto()
                                }
                            >
                                <Icon name="trash"/>
                                {t('profile.removePhoto')}
                            </button>
                        )}

                        <span>
                            {t('profile.photoFormats')}
                            <br/>
                            {t('profile.photoSize')}
                        </span>
                    </div>
                </div>
            </div>
        </section>
    )
}
