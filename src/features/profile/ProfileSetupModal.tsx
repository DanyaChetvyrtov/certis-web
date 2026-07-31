import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../shared/api/ApiError'
import { Icon } from '../../components/Icons'
import { createProfile } from './api/profileApi'
import type { Profile } from './api/profileApi'
import './ProfileSetupModal.css'

type ProfileField = 'name' | 'surname' | 'dateOfBirth'
type ProfileFieldErrors = Partial<Record<ProfileField, string>>

type ProfileForm = {
  name: string
  surname: string
  dateOfBirth: string
}

type ProfileSetupModalProps = {
  onComplete: (profile: Profile) => void
}

const emptyForm: ProfileForm = {
  name: '',
  surname: '',
  dateOfBirth: '',
}

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const getLatestBirthDate = (): string => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  return formatLocalDate(yesterday)
}

const validateProfile = (values: ProfileForm): ProfileFieldErrors => {
  const errors: ProfileFieldErrors = {}

  if (!values.name.trim()) {
    errors.name = 'Enter your first name.'
  } else if (values.name.trim().length > 100) {
    errors.name = 'First name must be 100 characters or fewer.'
  }

  if (!values.surname.trim()) {
    errors.surname = 'Enter your last name.'
  } else if (values.surname.trim().length > 100) {
    errors.surname = 'Last name must be 100 characters or fewer.'
  }

  if (!values.dateOfBirth) {
    errors.dateOfBirth = 'Choose your date of birth.'
  } else if (values.dateOfBirth > getLatestBirthDate()) {
    errors.dateOfBirth = 'Date of birth must be in the past.'
  }

  return errors
}

const toFieldErrors = (
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

type ProfileFieldProps = {
  autoComplete: string
  disabled: boolean
  error?: string
  icon: 'calendar' | 'user'
  label: string
  max?: string
  maxLength?: number
  name: ProfileField
  onChange: (name: ProfileField, value: string) => void
  placeholder?: string
  type: 'date' | 'text'
  value: string
}

function ProfileFieldInput({
  autoComplete,
  disabled,
  error,
  icon,
  label,
  max,
  maxLength,
  name,
  onChange,
  placeholder,
  type,
  value,
}: ProfileFieldProps) {
  const inputId = `profile-${name}`

  return (
    <div className="profile-field">
      <label htmlFor={inputId}>{label}</label>
      <div
        className={`profile-input-shell${error ? ' profile-input-shell-error' : ''}`}
      >
        <Icon name={icon} />
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          max={max}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          onChange={(event) => onChange(name, event.target.value)}
        />
      </div>
      {error && (
        <span className="profile-field-error" id={`${inputId}-error`}>
          {error}
        </span>
      )}
    </div>
  )
}

export function ProfileSetupModal({ onComplete }: ProfileSetupModalProps) {
  const firstInputRef = useRef<HTMLInputElement>(null)
  const [values, setValues] = useState<ProfileForm>(emptyForm)
  const [errors, setErrors] = useState<ProfileFieldErrors>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    firstInputRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const updateField = (name: ProfileField, value: string) => {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setNotice(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationErrors = validateProfile(values)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    setErrors({})
    setNotice(null)

    try {
      const profile = await createProfile({
        name: values.name.trim(),
        surname: values.surname.trim(),
        dateOfBirth: values.dateOfBirth,
      })

      onComplete(profile)
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(toFieldErrors(error.fieldErrors))
        setNotice(error.message)
      } else {
        setNotice('Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="profile-modal-layer">
      <div className="profile-modal-backdrop" aria-hidden="true" />
      <section
        className="profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-setup-title"
        aria-describedby="profile-setup-description"
      >
        <div className="profile-modal-accent" aria-hidden="true" />

        <header className="profile-modal-header">
          <span className="profile-avatar-placeholder" aria-hidden="true">
            <Icon name="user" />
          </span>
          <div>
            <div className="profile-modal-meta">
              <span>Welcome to Certis</span>
              <span>Final step</span>
            </div>
            <h2 id="profile-setup-title">Let&apos;s make Certis yours</h2>
            <p id="profile-setup-description">
              Tell us a little about yourself. We&apos;ll use this to personalize
              your workspace.
            </p>
          </div>
        </header>

        <form className="profile-form" onSubmit={handleSubmit} noValidate>
          <div className="profile-name-fields">
            <div className="profile-field">
              <label htmlFor="profile-name">First name</label>
              <div
                className={`profile-input-shell${errors.name ? ' profile-input-shell-error' : ''}`}
              >
                <Icon name="user" />
                <input
                  ref={firstInputRef}
                  id="profile-name"
                  name="name"
                  type="text"
                  value={values.name}
                  maxLength={100}
                  placeholder="Daniel"
                  autoComplete="given-name"
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={
                    errors.name ? 'profile-name-error' : undefined
                  }
                  onChange={(event) => updateField('name', event.target.value)}
                />
              </div>
              {errors.name && (
                <span className="profile-field-error" id="profile-name-error">
                  {errors.name}
                </span>
              )}
            </div>

            <ProfileFieldInput
              label="Last name"
              name="surname"
              type="text"
              icon="user"
              value={values.surname}
              error={errors.surname}
              onChange={updateField}
              autoComplete="family-name"
              placeholder="Carter"
              maxLength={100}
              disabled={isSubmitting}
            />
          </div>

          <ProfileFieldInput
            label="Date of birth"
            name="dateOfBirth"
            type="date"
            icon="calendar"
            value={values.dateOfBirth}
            error={errors.dateOfBirth}
            onChange={updateField}
            autoComplete="bday"
            max={getLatestBirthDate()}
            disabled={isSubmitting}
          />

          {notice && (
            <div className="profile-form-notice" role="alert">
              <Icon name="alert" />
              <span>{notice}</span>
            </div>
          )}

          <footer className="profile-modal-footer">
            <p>
              <Icon name="shield" />
              Your personal details stay private.
            </p>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating profile…' : 'Open my dashboard'}
              {isSubmitting ? (
                <span className="profile-spinner" aria-hidden="true" />
              ) : (
                <Icon name="arrow-right" />
              )}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}
