import { Link } from 'react-router-dom'
import { CertisLogo, Icon } from '../components/Icons'
import { useSession } from '../features/auth/session/SessionContext'
import './WorkspaceSidebar.css'

type WorkspaceSidebarProps = {
  activePage: 'dashboard' | 'accounts'
  activeAccounts?: number
}

const futureNavigation = [
  { label: 'Transactions', icon: 'receipt' as const },
  { label: 'Budgets', icon: 'gauge' as const },
  { label: 'Goals', icon: 'target' as const },
  { label: 'Categories', icon: 'list' as const },
]

export function WorkspaceSidebar({
  activePage,
  activeAccounts = 0,
}: WorkspaceSidebarProps) {
  const { profile } = useSession()
  const displayName = profile
    ? `${profile.name} ${profile.surname.charAt(0)}.`
    : 'Personal workspace'
  const initials = profile
    ? `${profile.name.charAt(0)}${profile.surname.charAt(0)}`.toUpperCase()
    : 'C'

  return (
    <aside className="workspace-sidebar">
      <Link className="workspace-brand-link" to="/dashboard" aria-label="Certis dashboard">
        <CertisLogo className="workspace-logo" />
      </Link>

      <nav className="workspace-navigation" aria-label="Workspace navigation">
        <p>Workspace</p>
        <Link
          className={activePage === 'dashboard' ? 'active' : undefined}
          to="/dashboard"
          aria-current={activePage === 'dashboard' ? 'page' : undefined}
        >
          <Icon name="dashboard" />
          <span>Dashboard</span>
        </Link>
        <Link
          className={activePage === 'accounts' ? 'active' : undefined}
          to="/accounts"
          aria-current={activePage === 'accounts' ? 'page' : undefined}
        >
          <Icon name="wallet" />
          <span>Accounts</span>
        </Link>
        {futureNavigation.map((item) => (
          <span className="workspace-nav-disabled" aria-disabled="true" key={item.label}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </span>
        ))}
      </nav>

      <div className="workspace-sidebar-spacer" />

      <section className="workspace-insight" aria-label="Account overview">
        <span><Icon name="piggy-bank" /></span>
        <strong>Your money, one place</strong>
        <p>
          {activeAccounts === 0
            ? 'Create your first account to start tracking balances.'
            : `${activeAccounts} active ${activeAccounts === 1 ? 'account is' : 'accounts are'} included in your overview.`}
        </p>
      </section>

      <span className="workspace-settings-link" aria-disabled="true">
        <Icon name="settings" />
        <span>Settings</span>
      </span>

      <div className="workspace-person">
        <span className="workspace-avatar">{initials}</span>
        <span>
          <strong>{displayName}</strong>
          <small>Personal workspace</small>
        </span>
        <Icon name="chevron-down" />
      </div>
    </aside>
  )
}
