import {useRef} from 'react'
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
    const photoInputRef =
        useRef<HTMLInputElement>(null)

    const initials =
        `${profile.name.charAt(0)}${profile.surname.charAt(0)}`
            .toUpperCase()

    return (
        <section className="profile-editor-section">
            <p className="profile-editor-eyebrow">
                Profile photo
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
                        Your Certis profile
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
                                ? 'Change photo'
                                : 'Add photo'}
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
                                Remove
                            </button>
                        )}

                        <span>
                            JPG, PNG or WebP
                            <br/>
                            Up to 5 MB
                        </span>
                    </div>
                </div>
            </div>
        </section>
    )
}