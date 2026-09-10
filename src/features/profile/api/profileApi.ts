import {ApiError} from '../../../shared/api/ApiError'
import {apiRequest} from '../../../shared/api/client'
import type {Currency} from '../../../shared/currency'
import i18n from '../../../i18n/i18n'

export type ProfileRequest = {
    name: string
    surname: string
    dateOfBirth: string
}

export type CreateProfileRequest = ProfileRequest & {
    preferredCurrency?: Currency
}

export type UpdateProfileRequest = ProfileRequest & {
    preferredCurrency?: Currency
}

export type Profile = ProfileRequest & {
    id: string
    preferredCurrency: Currency
    photoUrl?: string
}

export type ProfilePhotoMeta = {
    id: string
    profileId: string
    originalFileName: string
    extension: string
    fileSize: number
    width: number
    height: number
    contentType: string
    url: string
}

const profilePath = (
    profileId: string,
): string =>
    `/api/v1/profiles/${profileId}`

const profilePhotoPath = (
    profileId: string,
): string =>
    `${profilePath(profileId)}/photo`

const createPhotoForm = (
    photo: File,
): FormData => {
    const body = new FormData()
    body.append('photo', photo)

    return body
}

const fallbackMessage = () => i18n.t('profile.loadError')

export const getCurrentProfile =
    async (): Promise<Profile | null> => {
        try {
            return await apiRequest<Profile>(
                '/api/v1/profiles/me',
                {
                    fallbackMessage: fallbackMessage(),
                },
            )
        } catch (error) {
            if (
                error instanceof ApiError
                && error.status === 404
            ) {
                return null
            }

            throw error
        }
    }

export const createProfile = (
    request: CreateProfileRequest,
): Promise<Profile> =>
    apiRequest<Profile>('/api/v1/profiles', {
        method: 'POST',
        body: request,
        fallbackMessage:
            i18n.t('profile.saveError'),
    })

export const updateProfile = (
    profileId: string,
    request: UpdateProfileRequest,
): Promise<Profile> =>
    apiRequest<Profile>(
        profilePath(profileId),
        {
            method: 'PUT',
            body: request,
            fallbackMessage:
                i18n.t('profile.updateError'),
        },
    )

export const uploadProfilePhoto = (
    profileId: string,
    photo: File,
): Promise<ProfilePhotoMeta> =>
    apiRequest<ProfilePhotoMeta>(
        profilePhotoPath(profileId),
        {
            method: 'POST',
            body: createPhotoForm(photo),
            fallbackMessage:
                i18n.t('profile.photoSaveError'),
        },
    )

export const updateProfilePhoto = (
    profileId: string,
    photo: File,
): Promise<ProfilePhotoMeta> =>
    apiRequest<ProfilePhotoMeta>(
        profilePhotoPath(profileId),
        {
            method: 'PUT',
            body: createPhotoForm(photo),
            fallbackMessage:
                i18n.t('profile.photoSaveError'),
        },
    )

export const deleteProfilePhoto = (
    profileId: string,
): Promise<void> =>
    apiRequest(
        profilePhotoPath(profileId),
        {
            method: 'DELETE',
            fallbackMessage:
                i18n.t('profile.photoRemoveError'),
        },
    )
