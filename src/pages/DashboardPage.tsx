import { CertisLogo, Icon } from '../components/Icons'
import { useSession } from '../features/auth/session/SessionContext'
import { ProfileSetupModal } from '../features/profile/ProfileSetupModal'
import type { Profile } from '../features/profile/api/profileApi'
import './DashboardPage.css'

export function DashboardPage() {
  const { profile, setProfile } = useSession()
  const isProfileSetupOpen = profile === null

  const completeProfileSetup = (createdProfile: Profile) => {
    setProfile(createdProfile)
  }

  return (
    <div
      className={`dashboard-shell${isProfileSetupOpen ? ' dashboard-modal-open' : ''}`}
    >
      <header className="dashboard-header">
        <CertisLogo className="dashboard-logo" />
        <span className="dashboard-status">
          <span aria-hidden="true" />
          {profile ? 'Profile ready' : 'Session verified'}
        </span>
      </header>

      <main className="dashboard-main">
        <p className="eyebrow eyebrow-gold">Your workspace</p>
        <h1>{profile ? `Welcome, ${profile.name}` : 'Welcome to Certis'}</h1>
        <p className="dashboard-lead">
          Authentication is connected. Your financial dashboard is the next
          step.
        </p>

        <section className="dashboard-placeholder">
          <span className="dashboard-check">
            <Icon name="check-circle" />
          </span>
          <div>
            <p className="eyebrow eyebrow-muted">Integration status</p>
            <h2>You&apos;re securely signed in</h2>
            <p>
              Certis verified your refresh cookie with the API and issued a
              fresh access token before opening this page.
            </p>
          </div>
        </section>

        <div className="dashboard-next-steps" aria-label="Verified flow">
          <article>
            <span>01</span>
            <strong>Account created</strong>
            <p>Registration data was accepted by certis-api.</p>
          </article>
          <article>
            <span>02</span>
            <strong>Cookies secured</strong>
            <p>JWT values stay in HttpOnly cookies, outside JavaScript.</p>
          </article>
          <article>
            <span>03</span>
            <strong>Dashboard opened</strong>
            <p>The authenticated route is ready for the real interface.</p>
          </article>
        </div>
      </main>

      <p className="dashboard-footer">Certis • Dashboard coming next</p>

      {isProfileSetupOpen && (
        <ProfileSetupModal onComplete={completeProfileSetup} />
      )}
    </div>
  )
}
