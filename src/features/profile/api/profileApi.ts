import { ApiError } from '../../../shared/api/ApiError'
import { apiRequest } from '../../../shared/api/client'

export type CreateProfileRequest = {
  name: string
  surname: string
  dateOfBirth: string
}

export type Profile = CreateProfileRequest & {
  id: string
  photoUrl?: string
}

const fallbackMessage = 'We could not load your profile. Please try again.'

export const getCurrentProfile = async (): Promise<Profile | null> => {
  try {
    return await apiRequest<Profile>('/api/v1/profiles/me', { fallbackMessage })
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }

    throw error
  }
}

export const createProfile = (request: CreateProfileRequest) =>
  apiRequest<Profile>('/api/v1/profiles', {
    method: 'POST',
    body: request,
    fallbackMessage: 'We could not save your profile. Please try again.',
  })
