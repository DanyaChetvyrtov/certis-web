import { Link } from 'react-router-dom'
import type { CSSProperties, ReactNode } from 'react'
import { Icon } from '../../../components/Icons'
import type { IconName } from '../../../components/Icons'
import compactCrestUrl from '../../../assets/certis-crest-compact.webp'
import detailedCrestUrl from '../../../assets/certis-crest-detailed.webp'
import './LandingPage.css'

type BrandMarkProps = {
  compact?: boolean
  detailed?: boolean
}

function BrandMark({ compact = false, detailed = false }: BrandMarkProps) {
  const className = [
    'landing-brand',
    compact ? 'landing-brand-compact' : '',
    detailed ? 'landing-brand-detailed' : '',
  ].filter(Boolean).join(' ')

  return (
    <span className={className}>
      <span className="landing-brand-mark" aria-hidden="true">
        <img
          src={detailed ? detailedCrestUrl : compactCrestUrl}
          alt=""
        />
      </span>
      <span className="landing-brand-copy">
        <strong>Certis</strong>
        {!compact && !detailed && <small>by Digital Hustle</small>}
      </span>
    </span>
  )
}

function DashboardPreview() {
  const summary = [
    {
      label: 'Total balance',
      value: '₽612,840',
      note: '+₽12,580 this week',
      icon: 'wallet' as IconName,
      tone: 'green',
    },
    {
      label: 'Income',
      value: '₽185,000',
      note: 'Salary · recurring',
      icon: 'trend-up' as IconName,
      tone: 'blue',
    },
    {
      label: 'Spent',
      value: '₽132,420',
      note: '68% of budget',
      icon: 'trend-down' as IconName,
      tone: 'red',
    },
    {
      label: 'Planned savings',
      value: '₽30,500',
      note: '82% savings rate',
      icon: 'piggy-bank' as IconName,
      tone: 'gold',
    },
  ]

  return (
    <div
      className="landing-dashboard-frame"
      role="img"
      aria-label="Preview of the Certis personal finance dashboard"
    >
      <div className="landing-window-bar" aria-hidden="true">
        <span />
        <span />
        <span />
        <i />
      </div>
      <div className="landing-dashboard">
        <aside className="landing-dashboard-sidebar">
          <BrandMark compact />
          <small>Overview</small>
          <div className="landing-dashboard-nav-item active">
            <Icon name="dashboard" />
            Dashboard
          </div>
          <div className="landing-dashboard-nav-item">
            <Icon name="wallet" />
            Accounts
          </div>
          <div className="landing-dashboard-nav-item">
            <Icon name="transfer" />
            Transactions
          </div>
          <div className="landing-dashboard-nav-item">
            <Icon name="gauge" />
            Budgets
          </div>
          <div className="landing-dashboard-nav-item">
            <Icon name="target" />
            Goals
          </div>
          <div className="landing-dashboard-nav-item">
            <Icon name="categories" />
            Categories
          </div>
          <div className="landing-dashboard-user">
            <span>DC</span>
            <div>
              <strong>Danil Chetvyrtov</strong>
              <small>demo@digital-hustle.ru</small>
            </div>
          </div>
        </aside>

        <div className="landing-dashboard-content">
          <header className="landing-dashboard-heading">
            <div>
              <h3>Good morning, Danil</h3>
              <p>Here is how your money is doing in August.</p>
            </div>
            <span>August 2026</span>
          </header>

          <div className="landing-summary-grid">
            {summary.map((item) => (
              <article key={item.label} className="landing-summary-card">
                <div className={`landing-summary-icon ${item.tone}`}>
                  <Icon name={item.icon} />
                </div>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </div>

          <div className="landing-dashboard-panels">
            <article className="landing-chart-panel">
              <header>
                <div>
                  <h4>Cash flow</h4>
                  <p>Income and spending over the last 6 months</p>
                </div>
                <div className="landing-chart-legend">
                  <span>Income</span>
                  <span>Spent</span>
                </div>
              </header>
              <svg viewBox="0 0 560 190" aria-hidden="true">
                <defs>
                  <linearGradient id="landing-chart-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity=".22" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path className="grid" d="M12 36H548M12 84H548M12 132H548M12 180H548" />
                <path
                  className="area"
                  d="M12 145C55 122 81 130 121 102S187 64 225 81s72 8 108-20 72 10 110-17 66-6 105-28V180H12Z"
                />
                <path
                  className="income"
                  d="M12 145C55 122 81 130 121 102S187 64 225 81s72 8 108-20 72 10 110-17 66-6 105-28"
                />
                <path
                  className="expense"
                  d="M12 163C48 151 84 150 121 134s79-2 116-19 74 1 109-24 77 8 112-15 62-4 90-19"
                />
              </svg>
              <div className="landing-chart-labels" aria-hidden="true">
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
              </div>
            </article>

            <article className="landing-activity-panel">
              <header>
                <h4>Recent activity</h4>
                <span>View all</span>
              </header>
              {[
                ['Salary', 'Income · Today', '+₽185,000', 'trend-up'],
                ['Apartment rent', 'Housing · Today', '−₽75,000', 'home'],
                ['Groceries', 'Food · Yesterday', '−₽4,290', 'shopping-cart'],
                ['Card transfer', 'Between accounts', '₽20,000', 'transfer'],
              ].map(([title, category, amount, icon]) => (
                <div className="landing-activity-row" key={title}>
                  <span>
                    <Icon name={icon as IconName} />
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <small>{category}</small>
                  </div>
                  <b className={amount.startsWith('+') ? 'positive' : ''}>{amount}</b>
                </div>
              ))}
            </article>
          </div>
        </div>
      </div>
    </div>
  )
}

function AccountsPreview() {
  return (
    <div className="feature-visual accounts-visual" aria-hidden="true">
      <div className="mini-window accounts-window">
        <header>
          <div>
            <h3>Accounts</h3>
            <small>Total balance</small>
            <strong>₽612,840</strong>
          </div>
          <span className="mini-action">Add account</span>
        </header>
        <div className="account-cards">
          <article>
            <span><Icon name="bank" /></span>
            <div><small>Tinkoff Black</small><strong>₽286,440</strong></div>
          </article>
          <article>
            <span><Icon name="piggy-bank" /></span>
            <div><small>Savings</small><strong>₽80,000</strong></div>
          </article>
        </div>
        <article className="mini-chart-card">
          <strong>Balance movement</strong>
          <svg viewBox="0 0 420 90">
            <path className="area" d="M0 73C42 65 52 42 92 48s62 8 98-13 70 15 106-5 73 11 124-20V90H0Z" />
            <path d="M0 73C42 65 52 42 92 48s62 8 98-13 70 15 106-5 73 11 124-20" />
          </svg>
        </article>
      </div>
    </div>
  )
}

function BudgetPreview() {
  const categories = [
    { name: 'Apartment rent', amount: '₽75,000 / ₽75,000', progress: 100, tone: 'gold' },
    { name: 'Groceries', amount: '₽17,100 / ₽20,000', progress: 72, tone: 'green' },
    { name: 'Dining out', amount: '₽8,100 / ₽8,000', progress: 92, tone: 'red' },
  ]

  return (
    <div className="feature-visual budget-visual" aria-hidden="true">
      <div className="mini-window budget-window">
        <header>
          <div><h3>August budget</h3><small>Planned savings</small><strong>₽30,500</strong></div>
          <span>82% spent</span>
        </header>
        {categories.map((category) => (
          <div className="budget-row" key={category.name}>
            <div><strong>{category.name}</strong><span>{category.amount}</span></div>
            <i
              className={category.tone}
              style={{ '--progress': `${category.progress}%` } as CSSProperties}
            />
          </div>
        ))}
        <div className="budget-note">
          <Icon name="check-circle" />
          <span><strong>Protected an additional ₽6,000</strong><small>Balances two flexible categories — only after your confirmation.</small></span>
        </div>
      </div>
    </div>
  )
}

function GoalsPreview() {
  const goals = [
    {
      name: 'Emergency fund',
      detail: 'Target · December 2026',
      amount: '₽180,000',
      progress: 67,
      tone: 'green',
    },
    {
      name: 'Travel to Japan',
      detail: 'Target · April 2027',
      amount: '₽240,000',
      progress: 31,
      tone: 'gold',
    },
  ]

  return (
    <div className="feature-visual goals-visual" aria-hidden="true">
      <div className="mini-window goals-window">
        <header><h3>Financial goals</h3><span className="mini-action">New goal</span></header>
        {goals.map((goal) => (
          <article className="goal-row" key={goal.name}>
            <span className={goal.tone}>
              <Icon name={goal.tone === 'green' ? 'shield' : 'gift'} />
            </span>
            <div>
              <strong>{goal.name}</strong>
              <small>{goal.detail}</small>
              <i>
                <b
                  className={goal.tone}
                  style={{ '--progress': `${goal.progress}%` } as CSSProperties}
                />
              </i>
            </div>
            <b>{goal.amount}</b>
          </article>
        ))}
        <footer><strong>On track</strong><span>You are ₽6,200 ahead this month</span></footer>
      </div>
    </div>
  )
}

type FeatureCopyProps = {
  eyebrow: string
  title: ReactNode
  description: string
  bullets: string[]
  link: string
  anchorId?: string
}

function FeatureCopy({ eyebrow, title, description, bullets, link, anchorId }: FeatureCopyProps) {
  return (
    <div className="feature-copy" id={anchorId}>
      <p>{eyebrow}</p>
      <h2>{title}</h2>
      <span>{description}</span>
      <ul>
        {bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
      </ul>
      <Link to="/auth#create-account">{link} <Icon name="arrow-right" /></Link>
    </div>
  )
}

export function LandingPage() {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#top" className="landing-home-link" aria-label="Certis home">
            <BrandMark />
          </a>
          <div className="landing-nav-links">
            <a href="#product">Product</a>
            <a href="#budgets">Budgets</a>
            <a href="#goals">Goals</a>
            <a href="#how-it-works">How it works</a>
            <a href="#security">Security</a>
          </div>
          <div className="landing-nav-actions">
            <Link to="/auth#sign-in" className="landing-sign-in">Sign in</Link>
            <Link to="/auth#create-account" className="landing-nav-cta">Start planning</Link>
          </div>
        </nav>

        <div className="landing-hero-content" id="top">
          <div className="hero-mark"><BrandMark detailed /></div>
          <p className="landing-kicker"><span>Personal finance, made clear</span></p>
          <h1>Your money, with a clear<br />sense of <em>direction.</em></h1>
          <p className="landing-hero-copy">
            Accounts, budgets, transactions and goals in one calm view.<br />
            See what changed, understand why, and choose your next move.
          </p>
          <div className="landing-hero-actions">
            <Link to="/auth#create-account">Start planning <Icon name="arrow-right" /></Link>
            <a href="#product">Explore Certis</a>
          </div>
          <small className="landing-reassurance">No spreadsheets · No guesswork · Your plan stays yours</small>
        </div>

        <div className="landing-dashboard-wrap">
          <DashboardPreview />
        </div>
      </section>

      <main className="landing-story">
        <section className="landing-section-intro" id="product">
          <p>The whole picture</p>
          <h2>A clearer way to manage money.</h2>
          <span>Built around the decisions you make every month — not around financial jargon.</span>
        </section>

        <section className="landing-feature-row">
          <FeatureCopy
            eyebrow="01 · Accounts & cash flow"
            title={<>Every account.<br />One honest picture.</>}
            description="See balances, income and spending without reconciling five different places in your head."
            bullets={[
              'Multiple cash, bank and card accounts',
              'Transfers stay visible without inflating spend',
              'Recurring activity appears before it surprises you',
            ]}
            link="Explore accounts"
          />
          <AccountsPreview />
        </section>

        <section className="landing-feature-row landing-feature-reverse">
          <BudgetPreview />
          <FeatureCopy
            anchorId="budgets"
            eyebrow="02 · Budgets"
            title={<>Plan the month.<br />Adapt before it hurts.</>}
            description="Set clear limits for fixed and variable costs. Certis compares them with reality and flags overspending while there is still time to act."
            bullets={[
              'Fixed vs variable allocations',
              'Forecasts and real-time warnings',
              'Suggestions remain under your control',
            ]}
            link="Build a budget"
          />
        </section>

        <section className="landing-feature-row">
          <FeatureCopy
            anchorId="goals"
            eyebrow="03 · Goals & direction"
            title={<>Turn intention into<br />visible progress.</>}
            description="Give each goal a target, a date and a place in your monthly plan. Progress updates as you save."
            bullets={[
              'Clear target and monthly contribution',
              'A realistic completion forecast',
              'Savings stay connected to the plan',
            ]}
            link="Set a goal"
          />
          <GoalsPreview />
        </section>

        <section className="optimization-card" id="how-it-works">
          <div>
            <p><Icon name="gauge" /> Optimization mode</p>
            <h2>Save more, without breaking the plan.</h2>
            <span>Certis can model smarter allocations across flexible categories while protecting fixed costs and essential limits. Nothing changes until you approve it.</span>
            <Link to="/auth#create-account">Optimize my budget <Icon name="arrow-right" /></Link>
          </div>
          <div className="optimization-result" aria-label="Example saving reallocation">
            <small>Safe reallocation</small>
            <strong>+₽6,000 <span>possible savings</span></strong>
            <dl>
              <div><dt>Dining out</dt><dd>−₽4,000</dd></div>
              <div><dt>Shopping</dt><dd>−₽2,000</dd></div>
              <div><dt>Protected essentials</dt><dd>Unchanged</dd></div>
            </dl>
          </div>
        </section>

        <section className="landing-details" id="security">
          <header>
            <p>Everyday control</p>
            <h2>The details stay beautifully simple.</h2>
          </header>
          <div className="landing-detail-grid">
            {[
              ['transfer', 'Transfers that make sense', 'Move money between your accounts without turning it into fake income or spending.', 'Accounts · Tracking · One activity feed'],
              ['calendar', 'Recurring, not repetitive', 'Schedule salary, rent and subscriptions once. Certis keeps the timeline current automatically.', 'Daily · Weekly · Monthly · Yearly'],
              ['categories', 'Categories with context', 'Shape the system around your real life, then archive what you no longer need.', 'Custom · Editable · Archivable'],
            ].map(([icon, title, copy, meta]) => (
              <article key={title}>
                <span><Icon name={icon as IconName} /></span>
                <h3>{title}</h3>
                <p>{copy}</p>
                <small>{meta}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-final-cta">
          <BrandMark />
          <div>
            <h2>Make the next decision with confidence.</h2>
            <p>A calmer financial life starts with one clear view.</p>
          </div>
          <Link to="/auth#create-account">Start planning free <Icon name="arrow-right" /></Link>
        </section>

        <footer className="landing-footer">
          <div>
            <strong>Certis</strong>
            <small>A Digital Hustle product · Clarity for every financial decision.</small>
          </div>
          <div>
            <a href="#product">Product</a>
            <a href="#security">Privacy</a>
            <a href="#security">Security</a>
            <Link to="/auth#sign-in">Sign in</Link>
            <span>© 2026 Certis</span>
          </div>
        </footer>
      </main>
    </div>
  )
}
