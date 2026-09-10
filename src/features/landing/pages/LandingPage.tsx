import { Link } from 'react-router-dom'
import type { CSSProperties, ReactNode } from 'react'
import {useTranslation} from 'react-i18next'
import { Icon } from '../../../components/Icons'
import type { IconName } from '../../../components/Icons'
import {LanguageSwitcher} from '../../../components/LanguageSwitcher'
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
  const {t} = useTranslation()
  const summary = [
    {
      label: t('landing.preview.totalBalance'),
      value: '₽612,840',
      note: t('landing.preview.totalBalanceNote'),
      icon: 'wallet' as IconName,
      tone: 'green',
    },
    {
      label: t('landing.preview.income'),
      value: '₽185,000',
      note: t('landing.preview.incomeNote'),
      icon: 'trend-up' as IconName,
      tone: 'blue',
    },
    {
      label: t('landing.preview.spent'),
      value: '₽132,420',
      note: t('landing.preview.spentNote'),
      icon: 'trend-down' as IconName,
      tone: 'red',
    },
    {
      label: t('landing.preview.plannedSavings'),
      value: '₽30,500',
      note: t('landing.preview.plannedSavingsNote'),
      icon: 'piggy-bank' as IconName,
      tone: 'gold',
    },
  ]
  const months = t('landing.preview.months', {
    returnObjects: true,
  }) as unknown as string[]

  return (
    <div
      className="landing-dashboard-frame"
      role="img"
      aria-label={t('landing.preview.dashboardLabel')}
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
          <small>{t('landing.preview.overview')}</small>
          <div className="landing-dashboard-nav-item active">
            <Icon name="dashboard" />
            {t('landing.preview.dashboard')}
          </div>
          <div className="landing-dashboard-nav-item">
            <Icon name="wallet" />
            {t('landing.preview.accounts')}
          </div>
          <div className="landing-dashboard-nav-item">
            <Icon name="transfer" />
            {t('landing.preview.transactions')}
          </div>
          <div className="landing-dashboard-nav-item">
            <Icon name="gauge" />
            {t('landing.preview.budgets')}
          </div>
          <div className="landing-dashboard-nav-item">
            <Icon name="target" />
            {t('landing.preview.goals')}
          </div>
          <div className="landing-dashboard-nav-item">
            <Icon name="categories" />
            {t('landing.preview.categories')}
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
              <h3>{t('landing.preview.greeting')}</h3>
              <p>{t('landing.preview.monthSummary')}</p>
            </div>
            <span>{t('landing.preview.month')}</span>
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
                  <h4>{t('landing.preview.cashFlow')}</h4>
                  <p>{t('landing.preview.cashFlowDescription')}</p>
                </div>
                <div className="landing-chart-legend">
                  <span>{t('landing.preview.income')}</span>
                  <span>{t('landing.preview.spent')}</span>
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
                {months.map((month) => <span key={month}>{month}</span>)}
              </div>
            </article>

            <article className="landing-activity-panel">
              <header>
                <h4>{t('landing.preview.recentActivity')}</h4>
                <span>{t('landing.preview.viewAll')}</span>
              </header>
              {[
                [t('landing.preview.salary'), t('landing.preview.salaryMeta'), '+₽185,000', 'trend-up'],
                [t('landing.preview.apartmentRent'), t('landing.preview.housingToday'), '−₽75,000', 'home'],
                [t('landing.preview.groceries'), t('landing.preview.foodYesterday'), '−₽4,290', 'shopping-cart'],
                [t('landing.preview.cardTransfer'), t('landing.preview.betweenAccounts'), '₽20,000', 'transfer'],
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
  const {t} = useTranslation()

  return (
    <div className="feature-visual accounts-visual" aria-hidden="true">
      <div className="mini-window accounts-window">
        <header>
          <div>
            <h3>{t('landing.preview.accounts')}</h3>
            <small>{t('landing.preview.totalBalance')}</small>
            <strong>₽612,840</strong>
          </div>
          <span className="mini-action">{t('landing.preview.addAccount')}</span>
        </header>
        <div className="account-cards">
          <article>
            <span><Icon name="bank" /></span>
            <div><small>Tinkoff Black</small><strong>₽286,440</strong></div>
          </article>
          <article>
            <span><Icon name="piggy-bank" /></span>
            <div><small>{t('landing.preview.savings')}</small><strong>₽80,000</strong></div>
          </article>
        </div>
        <article className="mini-chart-card">
          <strong>{t('landing.preview.balanceMovement')}</strong>
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
  const {t} = useTranslation()
  const categories = [
    { name: t('landing.preview.apartmentRent'), amount: '₽75,000 / ₽75,000', progress: 100, tone: 'gold' },
    { name: t('landing.preview.groceries'), amount: '₽17,100 / ₽20,000', progress: 72, tone: 'green' },
    { name: t('landing.preview.diningOut'), amount: '₽8,100 / ₽8,000', progress: 92, tone: 'red' },
  ]

  return (
    <div className="feature-visual budget-visual" aria-hidden="true">
      <div className="mini-window budget-window">
        <header>
          <div><h3>{t('landing.preview.augustBudget')}</h3><small>{t('landing.preview.plannedSavings')}</small><strong>₽30,500</strong></div>
          <span>{t('landing.preview.percentSpent')}</span>
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
          <span><strong>{t('landing.preview.protectedMore')}</strong><small>{t('landing.preview.protectedMoreDescription')}</small></span>
        </div>
      </div>
    </div>
  )
}

function GoalsPreview() {
  const {t} = useTranslation()
  const goals = [
    {
      name: t('landing.preview.emergencyFund'),
      detail: t('landing.preview.emergencyTarget'),
      amount: '₽180,000',
      progress: 67,
      tone: 'green',
    },
    {
      name: t('landing.preview.japanTrip'),
      detail: t('landing.preview.japanTarget'),
      amount: '₽240,000',
      progress: 31,
      tone: 'gold',
    },
  ]

  return (
    <div className="feature-visual goals-visual" aria-hidden="true">
      <div className="mini-window goals-window">
        <header><h3>{t('landing.preview.financialGoals')}</h3><span className="mini-action">{t('landing.preview.newGoal')}</span></header>
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
        <footer><strong>{t('landing.preview.onTrack')}</strong><span>{t('landing.preview.ahead')}</span></footer>
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
  const {t} = useTranslation()
  const detailCards = [
    ['transfer', t('landing.details.transfersTitle'), t('landing.details.transfersDescription'), t('landing.details.transfersMeta')],
    ['calendar', t('landing.details.recurringTitle'), t('landing.details.recurringDescription'), t('landing.details.recurringMeta')],
    ['categories', t('landing.details.categoriesTitle'), t('landing.details.categoriesDescription'), t('landing.details.categoriesMeta')],
  ]

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <nav className="landing-nav" aria-label={t('landing.navigation.label')}>
          <a href="#top" className="landing-home-link" aria-label={t('landing.navigation.home')}>
            <BrandMark />
          </a>
          <div className="landing-nav-links">
            <a href="#product">{t('landing.navigation.product')}</a>
            <a href="#budgets">{t('landing.navigation.budgets')}</a>
            <a href="#goals">{t('landing.navigation.goals')}</a>
            <a href="#how-it-works">{t('landing.navigation.howItWorks')}</a>
            <a href="#security">{t('landing.navigation.security')}</a>
          </div>
          <div className="landing-nav-actions">
            <LanguageSwitcher className="landing-language-switcher"/>
            <Link to="/auth#sign-in" className="landing-sign-in">{t('landing.navigation.signIn')}</Link>
            <Link to="/auth#create-account" className="landing-nav-cta">{t('landing.navigation.startPlanning')}</Link>
          </div>
        </nav>

        <div className="landing-hero-content" id="top">
          <div className="hero-mark"><BrandMark detailed /></div>
          <p className="landing-kicker"><span>{t('landing.hero.kicker')}</span></p>
          <h1>{t('landing.hero.titleStart')}<br /><em>{t('landing.hero.titleEnd')}</em></h1>
          <p className="landing-hero-copy">
            {t('landing.hero.descriptionLine1')}<br />
            {t('landing.hero.descriptionLine2')}
          </p>
          <div className="landing-hero-actions">
            <Link to="/auth#create-account">{t('landing.navigation.startPlanning')} <Icon name="arrow-right" /></Link>
            <a href="#product">{t('landing.hero.explore')}</a>
          </div>
          <small className="landing-reassurance">{t('landing.hero.reassurance')}</small>
        </div>

        <div className="landing-dashboard-wrap">
          <DashboardPreview />
        </div>
      </section>

      <main className="landing-story">
        <section className="landing-section-intro" id="product">
          <p>{t('landing.intro.eyebrow')}</p>
          <h2>{t('landing.intro.title')}</h2>
          <span>{t('landing.intro.description')}</span>
        </section>

        <section className="landing-feature-row">
          <FeatureCopy
            eyebrow={t('landing.accounts.eyebrow')}
            title={<>{t('landing.accounts.titleLine1')}<br />{t('landing.accounts.titleLine2')}</>}
            description={t('landing.accounts.description')}
            bullets={[
              t('landing.accounts.bullet1'),
              t('landing.accounts.bullet2'),
              t('landing.accounts.bullet3'),
            ]}
            link={t('landing.accounts.link')}
          />
          <AccountsPreview />
        </section>

        <section className="landing-feature-row landing-feature-reverse">
          <BudgetPreview />
          <FeatureCopy
            anchorId="budgets"
            eyebrow={t('landing.budgets.eyebrow')}
            title={<>{t('landing.budgets.titleLine1')}<br />{t('landing.budgets.titleLine2')}</>}
            description={t('landing.budgets.description')}
            bullets={[
              t('landing.budgets.bullet1'),
              t('landing.budgets.bullet2'),
              t('landing.budgets.bullet3'),
            ]}
            link={t('landing.budgets.link')}
          />
        </section>

        <section className="landing-feature-row">
          <FeatureCopy
            anchorId="goals"
            eyebrow={t('landing.goals.eyebrow')}
            title={<>{t('landing.goals.titleLine1')}<br />{t('landing.goals.titleLine2')}</>}
            description={t('landing.goals.description')}
            bullets={[
              t('landing.goals.bullet1'),
              t('landing.goals.bullet2'),
              t('landing.goals.bullet3'),
            ]}
            link={t('landing.goals.link')}
          />
          <GoalsPreview />
        </section>

        <section className="optimization-card" id="how-it-works">
          <div>
            <p><Icon name="gauge" /> {t('landing.optimization.eyebrow')}</p>
            <h2>{t('landing.optimization.title')}</h2>
            <span>{t('landing.optimization.description')}</span>
            <Link to="/auth#create-account">{t('landing.optimization.link')} <Icon name="arrow-right" /></Link>
          </div>
          <div className="optimization-result" aria-label={t('landing.optimization.exampleLabel')}>
            <small>{t('landing.optimization.safeReallocation')}</small>
            <strong>+₽6,000 <span>{t('landing.optimization.possibleSavings')}</span></strong>
            <dl>
              <div><dt>{t('landing.optimization.diningOut')}</dt><dd>−₽4,000</dd></div>
              <div><dt>{t('landing.optimization.shopping')}</dt><dd>−₽2,000</dd></div>
              <div><dt>{t('landing.optimization.protectedEssentials')}</dt><dd>{t('landing.optimization.unchanged')}</dd></div>
            </dl>
          </div>
        </section>

        <section className="landing-details" id="security">
          <header>
            <p>{t('landing.details.eyebrow')}</p>
            <h2>{t('landing.details.title')}</h2>
          </header>
          <div className="landing-detail-grid">
            {detailCards.map(([icon, title, copy, meta]) => (
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
            <h2>{t('landing.finalCta.title')}</h2>
            <p>{t('landing.finalCta.description')}</p>
          </div>
          <Link to="/auth#create-account">{t('landing.finalCta.action')} <Icon name="arrow-right" /></Link>
        </section>

        <footer className="landing-footer">
          <div>
            <strong>Certis</strong>
            <small>{t('landing.footer.description')}</small>
          </div>
          <div>
            <a href="#product">{t('landing.navigation.product')}</a>
            <a href="#security">{t('landing.footer.privacy')}</a>
            <a href="#security">{t('landing.navigation.security')}</a>
            <Link to="/auth#sign-in">{t('landing.navigation.signIn')}</Link>
            <span>© 2026 Certis</span>
          </div>
        </footer>
      </main>
    </div>
  )
}
