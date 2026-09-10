import i18n from '../../i18n/i18n'

const MAX_PHOTO_SIZE =
    5 * 1024 * 1024

const ALLOWED_PHOTO_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
])

const ALLOWED_PHOTO_EXTENSIONS =
    new Set([
        'jpg',
        'jpeg',
        'png',
        'webp',
    ])

export const PROFILE_PHOTO_ACCEPT =
    '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp'

export const validateProfilePhoto = (
    photo: File,
): string | null => {
    if (photo.size > MAX_PHOTO_SIZE) {
        return i18n.t('profile.validation.photoSize')
    }

    const extension =
        photo.name
            .split('.')
            .pop()
            ?.toLowerCase()

    if (
        !extension
        || !ALLOWED_PHOTO_EXTENSIONS.has(
            extension,
        )
        || !ALLOWED_PHOTO_TYPES.has(
            photo.type,
        )
    ) {
        return i18n.t('profile.validation.photoType')
    }

    return null
}

export const createProfilePhotoSrc = (
    photoUrl: string | undefined,
    version: number,
): string | null => {
    if (!photoUrl) {
        return null
    }

    const separator =
        photoUrl.includes('?')
            ? '&'
            : '?'

    return `${photoUrl}${separator}v=${version}`
}
