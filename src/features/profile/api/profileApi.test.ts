import {
    http,
    HttpResponse,
} from 'msw'
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import {server} from '../../../test/server'
import {
    createProfile,
    deleteProfilePhoto,
    getCurrentProfile,
    updateProfile,
    updateProfilePhoto,
    uploadProfilePhoto,
} from './profileApi'

const profile = {
    id: 'profile-id',
    name: 'Daniel',
    surname: 'Carter',
    dateOfBirth: '2000-01-01',
    preferredCurrency: 'RUB' as const,
    photoUrl:
        'http://localhost:8080/api/v1/profiles/profile-id/photo',
}

const photoMeta = {
    id: 'photo-id',
    profileId: profile.id,
    originalFileName: 'avatar',
    extension: 'png',
    fileSize: 4,
    width: 128,
    height: 128,
    contentType: 'image/png',
    url:
        'http://localhost:8080/api/v1/profiles/profile-id/photo',
}

const createPhoto = (): File =>
    new File(
        [
            new Uint8Array([
                137,
                80,
                78,
                71,
            ]),
        ],
        'avatar.png',
        {
            type: 'image/png',
        },
    )

describe('profileApi', () => {
    it('treats a missing current profile as incomplete onboarding', async () => {
        server.use(
            http.get(
                '/api/v1/profiles/me',
                () =>
                    new HttpResponse(
                        null,
                        {
                            status: 404,
                        },
                    ),
            ),
        )

        await expect(
            getCurrentProfile(),
        ).resolves.toBeNull()
    })

    it('returns the current profile', async () => {
        server.use(
            http.get(
                '/api/v1/profiles/me',
                () =>
                    HttpResponse.json(
                        profile,
                    ),
            ),
        )

        await expect(
            getCurrentProfile(),
        ).resolves.toEqual(profile)
    })

    it('returns the profile created by onboarding', async () => {
        let receivedBody: unknown
        const createdProfile = {
            ...profile,
            preferredCurrency: 'EUR' as const,
        }

        server.use(
            http.post(
                '/api/v1/profiles',
                async ({request}) => {
                    receivedBody =
                        await request.json()

                    return HttpResponse.json(
                        createdProfile,
                        {
                            status: 201,
                        },
                    )
                },
            ),
        )

        await expect(
            createProfile({
                name: profile.name,
                surname: profile.surname,
                dateOfBirth:
                profile.dateOfBirth,
                preferredCurrency: 'EUR',
            }),
        ).resolves.toEqual(createdProfile)

        expect(receivedBody).toEqual({
            name: profile.name,
            surname: profile.surname,
            dateOfBirth:
            profile.dateOfBirth,
            preferredCurrency: 'EUR',
        })
    })

    it('omits the optional preferred currency when none is selected', async () => {
        let receivedBody: unknown

        server.use(
            http.post(
                '/api/v1/profiles',
                async ({request}) => {
                    receivedBody = await request.json()
                    return HttpResponse.json(profile, {status: 201})
                },
            ),
        )

        await createProfile({
            name: profile.name,
            surname: profile.surname,
            dateOfBirth: profile.dateOfBirth,
        })

        expect(receivedBody).toEqual({
            name: profile.name,
            surname: profile.surname,
            dateOfBirth: profile.dateOfBirth,
        })
    })

    it('updates the profile', async () => {
        const request = {
            name: 'Danil',
            surname: 'Chetvyrtov',
            dateOfBirth: '2001-11-14',
        }

        const updatedProfile = {
            ...profile,
            ...request,
        }

        let receivedBody: unknown

        server.use(
            http.put(
                '/api/v1/profiles/profile-id',
                async ({request}) => {
                    receivedBody =
                        await request.json()

                    return HttpResponse.json(
                        updatedProfile,
                    )
                },
            ),
        )

        await expect(
            updateProfile(
                profile.id,
                request,
            ),
        ).resolves.toEqual(
            updatedProfile,
        )

        expect(receivedBody).toEqual(
            request,
        )
    })

    it('uploads a new profile photo as multipart form data', async () => {
        const photo = createPhoto()

        const fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockImplementationOnce(
                async (_input, init) => {
                    const body = init?.body

                    expect(body)
                        .toBeInstanceOf(FormData)

                    if (!(body instanceof FormData)) {
                        throw new Error(
                            'Expected request body to be FormData',
                        )
                    }

                    const formPhoto =
                        body.get('photo')

                    expect(formPhoto)
                        .toBeInstanceOf(File)

                    if (!(formPhoto instanceof File)) {
                        throw new Error(
                            'Expected photo part to be a File',
                        )
                    }

                    expect(formPhoto.name)
                        .toBe('avatar.png')

                    expect(formPhoto.type)
                        .toBe('image/png')

                    expect(formPhoto.size)
                        .toBe(photo.size)

                    const headers =
                        new Headers(
                            init?.headers,
                        )

                    expect(
                        headers.has(
                            'Content-Type',
                        ),
                    ).toBe(false)

                    return HttpResponse.json(
                        photoMeta,
                        {
                            status: 201,
                        },
                    )
                },
            )

        try {
            await expect(
                uploadProfilePhoto(
                    profile.id,
                    photo,
                ),
            ).resolves.toEqual(photoMeta)

            expect(fetchSpy)
                .toHaveBeenCalledTimes(1)
        } finally {
            fetchSpy.mockRestore()
        }
    })

    it('replaces the existing profile photo as multipart form data', async () => {
        const photo = createPhoto()

        const fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockImplementationOnce(
                async (_input, init) => {
                    const body = init?.body

                    expect(body)
                        .toBeInstanceOf(FormData)

                    if (!(body instanceof FormData)) {
                        throw new Error(
                            'Expected request body to be FormData',
                        )
                    }

                    const formPhoto =
                        body.get('photo')

                    expect(formPhoto)
                        .toBeInstanceOf(File)

                    if (!(formPhoto instanceof File)) {
                        throw new Error(
                            'Expected photo part to be a File',
                        )
                    }

                    expect(formPhoto.name)
                        .toBe('avatar.png')

                    expect(formPhoto.type)
                        .toBe('image/png')

                    expect(formPhoto.size)
                        .toBe(photo.size)

                    const headers =
                        new Headers(
                            init?.headers,
                        )

                    expect(
                        headers.has(
                            'Content-Type',
                        ),
                    ).toBe(false)

                    return HttpResponse.json(
                        photoMeta,
                    )
                },
            )

        try {
            await expect(
                updateProfilePhoto(
                    profile.id,
                    photo,
                ),
            ).resolves.toEqual(photoMeta)

            expect(fetchSpy)
                .toHaveBeenCalledTimes(1)
        } finally {
            fetchSpy.mockRestore()
        }
    })

    it('deletes the profile photo', async () => {
        let deleteRequestCount = 0

        server.use(
            http.delete(
                '/api/v1/profiles/profile-id/photo',
                () => {
                    deleteRequestCount += 1

                    return new HttpResponse(
                        null,
                        {
                            status: 204,
                        },
                    )
                },
            ),
        )

        await expect(
            deleteProfilePhoto(
                profile.id,
            ),
        ).resolves.toBeUndefined()

        expect(
            deleteRequestCount,
        ).toBe(1)
    })
})
