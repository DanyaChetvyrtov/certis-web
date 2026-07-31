import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '../../../test/server'
import { createProfile, getCurrentProfile } from './profileApi'

describe('profileApi', () => {
  it('treats a missing current profile as incomplete onboarding', async () => {
    server.use(
      http.get('/api/v1/profiles/me', () => new HttpResponse(null, { status: 404 })),
    )

    await expect(getCurrentProfile()).resolves.toBeNull()
  })

  it('returns the profile created by onboarding', async () => {
    const profile = {
      id: 'profile-id',
      name: 'Daniel',
      surname: 'Carter',
      dateOfBirth: '2000-01-01',
    }
    server.use(
      http.post('/api/v1/profiles', () => HttpResponse.json(profile, { status: 201 })),
    )

    await expect(createProfile({
      name: profile.name,
      surname: profile.surname,
      dateOfBirth: profile.dateOfBirth,
    })).resolves.toEqual(profile)
  })
})
