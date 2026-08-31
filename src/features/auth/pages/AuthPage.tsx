import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../../shared/api/ApiError'
import { CertisLogo, Icon } from '../../../components/Icons'
import { useSession } from '../session/SessionContext'
import '../../../App.css'

type AuthMode = 'login' | 'register'
type FieldName = 'email' | 'password' | 'passwordConfirmation'
type FieldErrors = Partial<Record<FieldName, string>>

type FormValues = {
  email: string
  password: string
  passwordConfirmation: string
}

type Notice = {
  kind: 'error' | 'success'
  message: string
}

const emptyForm: FormValues = {
  email: '',
  password: '',
  passwordConfirmation: '',
}

const getInitialMode = (): AuthMode =>
  window.location.hash === '#create-account' ? 'register' : 'login'

function BrandPanel() {
  return (
    <aside className="brand-panel" aria-label="About Certis">
      <div className="brand-orbit brand-orbit-primary" aria-hidden="true" />
      <div className="brand-orbit brand-orbit-secondary" aria-hidden="true" />

      <CertisLogo className="brand-logo" />

      <div className="brand-copy">
        <p className="eyebrow eyebrow-muted">Personal finance, made clear</p>
        <h1>
          Your money.
          <br />
          Your plan.
          <br />
          One clear view.
        </h1>
        <p className="brand-description">
          Every account, budget, goal and transaction — finally working
          together.
        </p>

        <div className="feature-pills" aria-label="Certis features">
          <div className="feature-pill">
            <span className="feature-icon">
              <Icon name="wallet" />
            </span>
            Accounts
          </div>
          <div className="feature-pill">
            <span className="feature-icon">
              <Icon name="bank" />
            </span>
            Budgets
          </div>
          <div className="feature-pill">
            <span className="feature-icon">
              <Icon name="target" />
            </span>
            Goals
          </div>
        </div>
      </div>

      <section className="product-preview" aria-label="Product preview">
        <p className="eyebrow eyebrow-gold">Product preview</p>
        <h2>See how your money connects</h2>
        <p>One calm workspace for tracking, planning and saving.</p>

        <div className="preview-flow" aria-hidden="true">
          <div className="preview-step">
            <span className="preview-icon">
              <Icon name="wallet" />
            </span>
            <span>
              <strong>Accounts</strong>
              <small>Track</small>
            </span>
          </div>
          <Icon name="arrow-right" className="flow-arrow" />
          <div className="preview-step">
            <span className="preview-icon">
              <Icon name="bank" />
            </span>
            <span>
              <strong>Budgets</strong>
              <small>Plan</small>
            </span>
          </div>
          <Icon name="arrow-right" className="flow-arrow" />
          <div className="preview-step">
            <span className="preview-icon preview-icon-goal">
              <Icon name="target" />
            </span>
            <span>
              <strong>Goals</strong>
              <small>Save</small>
            </span>
          </div>
        </div>
      </section>

      <div className="brand-footer">
        <p>
          <Icon name="piggy-bank" />
          Build stability. Fund what&apos;s next.
        </p>
        <small>Certis by Digital Hustle • Private by design</small>
      </div>
    </aside>
  )
}

type AuthFieldProps = {
  autoComplete: string
  disabled?: boolean
  error?: string
  icon: 'lock' | 'mail'
  label: string
  name: FieldName
  onChange: (name: FieldName, value: string) => void
  type: 'email' | 'password'
  value: string
}

function AuthField({
  autoComplete,
  disabled = false,
  error,
  icon,
  label,
  name,
  onChange,
  type,
  value,
}: AuthFieldProps) {
  const [isPasswordVisible, setPasswordVisible] = useState(false)
  const inputId = `auth-${name}`
  const isPassword = type === 'password'

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <div className={`input-shell${error ? ' input-shell-error' : ''}`}>
        <Icon name={icon} className="input-icon" />
        <input
          id={inputId}
          name={name}
          type={isPassword && isPasswordVisible ? 'text' : type}
          value={value}
          onChange={(event) => onChange(name, event.target.value)}
          placeholder={type === 'email' ? 'you@example.com' : '••••••••••••'}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        {isPassword && (
          <button
            className="password-toggle"
            type="button"
            disabled={disabled}
            onClick={() => setPasswordVisible((current) => !current)}
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
          >
            <Icon name={isPasswordVisible ? 'eye-off' : 'eye'} />
          </button>
        )}
      </div>
      {error && (
        <span className="field-error" id={`${inputId}-error`}>
          {error}
        </span>
      )}
    </div>
  )
}

function validateForm(mode: AuthMode, values: FormValues): FieldErrors {
  const errors: FieldErrors = {}

  if (!values.email.trim()) {
    errors.email = 'Enter your email address.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }

  if (!values.password.trim()) {
    errors.password = 'Enter your password.'
  }

  if (mode === 'register') {
    if (!values.passwordConfirmation.trim()) {
      errors.passwordConfirmation = 'Confirm your password.'
    } else if (values.password !== values.passwordConfirmation) {
      errors.passwordConfirmation = 'Passwords do not match.'
    }
  }

  return errors
}

function toFieldErrors(errors?: Record<string, string>): FieldErrors {
  if (!errors) {
    return {}
  }

  const result: FieldErrors = {}
  const knownFields: FieldName[] = [
    'email',
    'password',
    'passwordConfirmation',
  ]

  for (const field of knownFields) {
    if (errors[field]) {
      result[field] = errors[field]
    }
  }

  return result
}

type AuthLocationState = {
  notice?: string
}

export function AuthCard() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signIn, signUp } = useSession()
  const locationState = location.state as AuthLocationState | null
  const [mode, setMode] = useState<AuthMode>(getInitialMode)
  const [values, setValues] = useState<FormValues>(emptyForm)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [notice, setNotice] = useState<Notice | null>(() =>
    locationState?.notice
      ? { kind: 'error', message: locationState.notice }
      : null,
  )
  const [isSubmitting, setSubmitting] = useState(false)

  const isLogin = mode === 'login'

  const selectMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setErrors({})
    setNotice(null)
    setValues((current) => ({
      ...current,
      password: '',
      passwordConfirmation: '',
    }))
    window.history.replaceState(
      null,
      '',
      nextMode === 'login' ? '#sign-in' : '#create-account',
    )
  }

  const updateField = (name: FieldName, value: string) => {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setNotice(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationErrors = validateForm(mode, values)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    setErrors({})
    setNotice(null)

    const email = values.email.trim()
    const credentials = {
      email,
      password: values.password,
    }
    let accountWasCreated = false

    try {
      if (!isLogin) {
        await signUp({
          email,
          password: values.password,
          passwordConfirmation: values.passwordConfirmation,
        })
        accountWasCreated = true
      }

      await signIn(credentials)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      if (accountWasCreated) {
        setMode('login')
        setValues({
          email,
          password: '',
          passwordConfirmation: '',
        })
        setErrors({})
        window.history.replaceState(null, '', '#sign-in')
        setNotice({
          kind: 'error',
          message:
            'Your account was created, but we could not sign you in automatically. Sign in to continue.',
        })
      } else if (error instanceof ApiError) {
        setErrors(toFieldErrors(error.fieldErrors))
        setNotice({ kind: 'error', message: error.message })
      } else {
        setNotice({
          kind: 'error',
          message: 'Something went wrong. Please try again.',
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-panel">
      <div className="auth-decoration auth-decoration-top" aria-hidden="true" />
      <div
        className="auth-decoration auth-decoration-bottom"
        aria-hidden="true"
      />

      <div className={`auth-card auth-card-${mode}`}>
        <p className="eyebrow eyebrow-gold">Certis account</p>
        <div className="auth-copy">
          <div
            className={`auth-copy-content${isLogin ? ' active' : ''}`}
            aria-hidden={!isLogin}
          >
            <h2>Welcome back</h2>
            <p className="auth-subtitle">
              Sign in to continue planning, tracking and saving.
            </p>
          </div>
          <div
            className={`auth-copy-content${!isLogin ? ' active' : ''}`}
            aria-hidden={isLogin}
          >
            <h2>Create your account</h2>
            <p className="auth-subtitle">
              A clearer view of your finances starts here.
            </p>
          </div>
        </div>

        <div
          className="auth-tabs"
          data-mode={mode}
          role="tablist"
          aria-label="Authentication"
        >
          <button
            id="sign-in-tab"
            type="button"
            role="tab"
            aria-selected={isLogin}
            aria-controls="auth-form"
            className={isLogin ? 'active' : ''}
            onClick={() => selectMode('login')}
          >
            Sign in
          </button>
          <button
            id="create-account-tab"
            type="button"
            role="tab"
            aria-selected={!isLogin}
            aria-controls="auth-form"
            className={!isLogin ? 'active' : ''}
            onClick={() => selectMode('register')}
          >
            Create account
          </button>
        </div>

        <form
          id="auth-form"
          aria-labelledby={
            isLogin ? 'sign-in-tab' : 'create-account-tab'
          }
          onSubmit={handleSubmit}
          noValidate
        >
          <AuthField
            label="Email address"
            name="email"
            type="email"
            icon="mail"
            value={values.email}
            error={errors.email}
            onChange={updateField}
            autoComplete="email"
          />

          <AuthField
            label="Password"
            name="password"
            type="password"
            icon="lock"
            value={values.password}
            error={errors.password}
            onChange={updateField}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />

          <div
            className={`confirmation-field${!isLogin ? ' visible' : ''}`}
            aria-hidden={isLogin}
          >
            <div className="confirmation-field-content">
              <AuthField
                label="Confirm password"
                name="passwordConfirmation"
                type="password"
                icon="lock"
                value={values.passwordConfirmation}
                error={errors.passwordConfirmation}
                onChange={updateField}
                autoComplete="new-password"
                disabled={isLogin}
              />
            </div>
          </div>

          {notice && (
            <div
              className={`form-notice form-notice-${notice.kind}`}
              role={notice.kind === 'error' ? 'alert' : 'status'}
            >
              <Icon
                name={notice.kind === 'error' ? 'alert' : 'check-circle'}
              />
              <span>{notice.message}</span>
            </div>
          )}

          <button
            className="submit-button"
            type="submit"
            disabled={isSubmitting}
          >
            <span key={mode} className="mode-text">
              {isSubmitting
                ? isLogin
                  ? 'Signing in…'
                  : 'Creating account…'
                : isLogin
                  ? 'Sign in'
                  : 'Create account'}
            </span>
            {isSubmitting ? (
              <span className="spinner" aria-hidden="true" />
            ) : (
              <Icon name="arrow-right" />
            )}
          </button>
        </form>

        <div className="security-note">
          <span className="security-icon">
            <Icon name="shield" />
          </span>
          <span className="security-note-copy">
            <span
              className={`security-note-content${isLogin ? ' active' : ''}`}
              aria-hidden={!isLogin}
            >
              <strong>Secure, cookie-based session</strong>
              <small>Your session is handled without exposing tokens.</small>
            </span>
            <span
              className={`security-note-content${!isLogin ? ' active' : ''}`}
              aria-hidden={isLogin}
            >
              <strong>One smooth, secure start</strong>
              <small>We&apos;ll sign you in and set up your profile next.</small>
            </span>
          </span>
        </div>

        <p className="auth-switch">
          <span key={mode} className="mode-text">
            {isLogin ? 'New to Certis?' : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => selectMode(isLogin ? 'register' : 'login')}
            >
              {isLogin ? 'Create account' : 'Sign in'}
            </button>
          </span>
        </p>
      </div>

      <span key={mode} className="view-label mode-text" aria-hidden="true">
        {isLogin ? 'Sign in' : 'Create account'}
      </span>
    </main>
  )
}

export function AuthPage() {
  return (
    <div className="app-shell">
      <BrandPanel />
      <AuthCard />
    </div>
  )
}
