import {Icon} from '../../../components/Icons'
import {
    getLatestBirthDate,
} from '../profileForm'
import type {
    ProfileField,
    ProfileFieldErrors,
    ProfileForm,
} from '../profileForm'

type ProfilePersonalSectionProps = {
    values: ProfileForm
    errors: ProfileFieldErrors
    notice: string | null
    disabled: boolean
    onChange: (
        field: ProfileField,
        value: string,
    ) => void
}

const NAME_ID =
    'profile-editor-name'

const SURNAME_ID =
    'profile-editor-surname'

const BIRTH_DATE_ID =
    'profile-editor-date-of-birth'

const NAME_ERROR_ID =
    `${NAME_ID}-error`

const SURNAME_ERROR_ID =
    `${SURNAME_ID}-error`

const BIRTH_DATE_ERROR_ID =
    `${BIRTH_DATE_ID}-error`

export function ProfilePersonalSection({
                                           values,
                                           errors,
                                           notice,
                                           disabled,
                                           onChange,
                                       }: ProfilePersonalSectionProps) {
    return (
        <section className="profile-editor-section profile-editor-personal">
            <p className="profile-editor-eyebrow">
                Personal information
            </p>

            <p className="profile-editor-section-copy">
                These details help personalize
                your Certis experience.
            </p>

            <div className="profile-editor-grid">
                <div className="profile-editor-field">
                    <label htmlFor={NAME_ID}>
                        First name
                    </label>

                    <input
                        id={NAME_ID}
                        name="name"
                        type="text"
                        autoComplete="given-name"
                        maxLength={100}
                        value={values.name}
                        disabled={disabled}
                        aria-invalid={
                            Boolean(errors.name)
                        }
                        aria-describedby={
                            errors.name
                                ? NAME_ERROR_ID
                                : undefined
                        }
                        onChange={(event) =>
                            onChange(
                                'name',
                                event.target.value,
                            )
                        }
                    />

                    {errors.name && (
                        <small
                            id={NAME_ERROR_ID}
                            className="profile-editor-field-error"
                        >
                            {errors.name}
                        </small>
                    )}
                </div>

                <div className="profile-editor-field">
                    <label htmlFor={SURNAME_ID}>
                        Last name
                    </label>

                    <input
                        id={SURNAME_ID}
                        name="surname"
                        type="text"
                        autoComplete="family-name"
                        maxLength={100}
                        value={values.surname}
                        disabled={disabled}
                        aria-invalid={
                            Boolean(
                                errors.surname,
                            )
                        }
                        aria-describedby={
                            errors.surname
                                ? SURNAME_ERROR_ID
                                : undefined
                        }
                        onChange={(event) =>
                            onChange(
                                'surname',
                                event.target.value,
                            )
                        }
                    />

                    {errors.surname && (
                        <small
                            id={SURNAME_ERROR_ID}
                            className="profile-editor-field-error"
                        >
                            {errors.surname}
                        </small>
                    )}
                </div>

                <div className="profile-editor-field profile-editor-birth-date">
                    <label htmlFor={BIRTH_DATE_ID}>
                        Date of birth
                    </label>

                    <input
                        id={BIRTH_DATE_ID}
                        name="dateOfBirth"
                        type="date"
                        autoComplete="bday"
                        max={
                            getLatestBirthDate()
                        }
                        value={
                            values.dateOfBirth
                        }
                        disabled={disabled}
                        aria-invalid={
                            Boolean(
                                errors.dateOfBirth,
                            )
                        }
                        aria-describedby={
                            errors.dateOfBirth
                                ? BIRTH_DATE_ERROR_ID
                                : undefined
                        }
                        onChange={(event) =>
                            onChange(
                                'dateOfBirth',
                                event.target.value,
                            )
                        }
                    />

                    {errors.dateOfBirth && (
                        <small
                            id={BIRTH_DATE_ERROR_ID}
                            className="profile-editor-field-error"
                        >
                            {
                                errors.dateOfBirth
                            }
                        </small>
                    )}
                </div>
            </div>

            <div className="profile-editor-privacy">
                <span aria-hidden="true"/>

                <div>
                    <strong>
                        Your profile is
                        visible only to you.
                    </strong>

                    <small>
                        Financial data and
                        account settings remain
                        separate from personal
                        information.
                    </small>
                </div>
            </div>

            {notice && (
                <div
                    className="profile-editor-notice"
                    role="alert"
                >
                    <Icon name="alert"/>
                    {notice}
                </div>
            )}
        </section>
    )
}