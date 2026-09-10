import i18n from '../../i18n/i18n'

export type ProfileForm = {
    name: string
    surname: string
    dateOfBirth: string
}

export type ProfileField =
    | 'name'
    | 'surname'
    | 'dateOfBirth'

export type ProfileFieldErrors =
    Partial<Record<ProfileField, string>>

export const EMPTY_PROFILE_FORM: ProfileForm = {
    name: '',
    surname: '',
    dateOfBirth: '',
}

export const createProfileForm = (
    source: ProfileForm,
): ProfileForm => ({
    name: source.name,
    surname: source.surname,
    dateOfBirth: source.dateOfBirth,
})

export const normalizeProfileForm = (
    values: ProfileForm,
): ProfileForm => ({
    name: values.name.trim(),
    surname: values.surname.trim(),
    dateOfBirth: values.dateOfBirth,
})

const formatLocalDate = (
    date: Date,
): string => {
    const year = date.getFullYear()

    const month = String(
        date.getMonth() + 1,
    ).padStart(2, '0')

    const day = String(
        date.getDate(),
    ).padStart(2, '0')

    return `${year}-${month}-${day}`
}

export const getLatestBirthDate =
    (): string => {
        const yesterday = new Date()

        yesterday.setDate(
            yesterday.getDate() - 1,
        )

        return formatLocalDate(yesterday)
    }

export const validateProfile = (
    values: ProfileForm,
): ProfileFieldErrors => {
    const errors: ProfileFieldErrors = {}

    const normalized =
        normalizeProfileForm(values)

    if (!normalized.name) {
        errors.name =
            i18n.t('profile.validation.nameRequired')
    } else if (
        normalized.name.length > 100
    ) {
        errors.name =
            i18n.t('profile.validation.nameTooLong')
    }

    if (!normalized.surname) {
        errors.surname =
            i18n.t('profile.validation.surnameRequired')
    } else if (
        normalized.surname.length > 100
    ) {
        errors.surname =
            i18n.t('profile.validation.surnameTooLong')
    }

    if (!normalized.dateOfBirth) {
        errors.dateOfBirth =
            i18n.t('profile.validation.birthDateRequired')
    } else if (
        normalized.dateOfBirth
        > getLatestBirthDate()
    ) {
        errors.dateOfBirth =
            i18n.t('profile.validation.birthDateFuture')
    }

    return errors
}

export const toProfileFieldErrors = (
    errors?: Record<string, string>,
): ProfileFieldErrors => {
    if (!errors) {
        return {}
    }

    return {
        name: errors.name,
        surname: errors.surname,
        dateOfBirth: errors.dateOfBirth,
    }
}

export const isProfileFormDirty = (
    values: ProfileForm,
    initialValues: ProfileForm,
): boolean => {
    const normalized =
        normalizeProfileForm(values)

    return (
        normalized.name
        !== initialValues.name
        || normalized.surname
        !== initialValues.surname
        || normalized.dateOfBirth
        !== initialValues.dateOfBirth
    )
}
