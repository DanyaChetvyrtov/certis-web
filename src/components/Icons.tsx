import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'alert'
  | 'arrow-down-left'
  | 'arrow-right'
  | 'arrow-up-right'
  | 'bank'
  | 'bell'
  | 'calendar'
  | 'card'
  | 'cash'
  | 'categories'
  | 'check-circle'
  | 'chevron-down'
  | 'chevron-right'
  | 'close'
  | 'credit-card'
  | 'dashboard'
  | 'edit'
  | 'eye'
  | 'eye-off'
  | 'briefcase'
  | 'gift'
  | 'gauge'
  | 'heart'
  | 'home'
  | 'list'
  | 'lock'
  | 'mail'
  | 'more'
  | 'piggy-bank'
  | 'plus'
  | 'receipt'
  | 'repeat'
  | 'search'
  | 'settings'
  | 'shield'
  | 'target'
  | 'tag'
  | 'trash'
  | 'transport'
  | 'trend-down'
  | 'trend-up'
  | 'user'
  | 'utensils'
  | 'wallet'
  | 'shopping-cart'

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName
}

const iconPaths: Record<IconName, ReactNode> = {
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </>
  ),
  'arrow-down-left': (
    <>
      <path d="M17 7 7 17" />
      <path d="M17 17H7V7" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </>
  ),
  'arrow-up-right': (
    <>
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </>
  ),
  bank: (
    <>
      <path d="m3 9 9-5 9 5" />
      <path d="M5 10h14" />
      <path d="M6 10v7M10 10v7M14 10v7M18 10v7" />
      <path d="M4 20h16M3 17h18" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18M10 12v2h4v-2" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4M17 3v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </>
  ),
  cash: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7 9h.01M17 15h.01" />
    </>
  ),
  categories: (
    <>
      <path d="M4 6h2M10 6h10M4 12h2M10 12h10M4 18h2M10 18h10" />
      <circle cx="7" cy="6" r="1" />
      <circle cx="7" cy="12" r="1" />
      <circle cx="7" cy="18" r="1" />
    </>
  ),
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </>
  ),
  'chevron-down': <path d="m7 10 5 5 5-5" />,
  'chevron-right': <path d="m9 18 6-6-6-6" />,
  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  'credit-card': (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" />
      <circle cx="12" cy="12" r="2.3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="m4 4 16 16" />
      <path d="M10.5 7.2A10.4 10.4 0 0 1 12 7c6 0 9.5 5 9.5 5a16 16 0 0 1-2.1 2.5M6.2 6.5C3.8 8.1 2.5 12 2.5 12s3.5 5 9.5 5a10 10 0 0 0 3-.4" />
      <path d="M10 10a2.8 2.8 0 0 0 4 4" />
    </>
  ),
  gauge: (
    <>
      <path d="M4 16a8 8 0 1 1 16 0" />
      <path d="m12 12 4-4M5 17h14" />
    </>
  ),
  gift: (
    <>
      <rect x="3" y="9" width="18" height="12" rx="2" />
      <path d="M12 9v12M3 13h18M5 9h14" />
      <path d="M12 9H8.5a2.5 2.5 0 1 1 2.1-3.9L12 7.2" />
      <path d="M12 9h3.5a2.5 2.5 0 1 0-2.1-3.9L12 7.2" />
    </>
  ),
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
  ),
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v11h14V10M9 21v-7h6v7" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14v3" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  'piggy-bank': (
    <>
      <path d="M5 10a7 7 0 0 1 12-2h3v5h-2a7 7 0 0 1-2 3v3h-3v-2H8v2H5v-3a6 6 0 0 1-2-4V9h2" />
      <path d="M14 7a4 4 0 0 0-5 0M16 11h.01" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  repeat: (
    <>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11V9a3 3 0 0 1 3-3h15" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v2a3 3 0 0 1-3 3H3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.6 2.8 8.2 7 10 4.2-1.8 7-5.4 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  tag: (
    <>
      <path d="M20.6 13.6 12 22.2 2.8 13V3h10l7.8 7.8a2 2 0 0 1 0 2.8Z" />
      <circle cx="8" cy="8" r="1.4" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  transport: (
    <>
      <rect x="5" y="3" width="14" height="17" rx="3" />
      <path d="M8 7h8M7 12h10M8 20l-2 2M16 20l2 2" />
      <circle cx="9" cy="16" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="16" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  'trend-down': (
    <>
      <path d="m3 7 7 7 4-4 7 7" />
      <path d="M15 17h6v-6" />
    </>
  ),
  'trend-up': (
    <>
      <path d="m3 17 7-7 4 4 7-7" />
      <path d="M15 7h6v6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  utensils: (
    <>
      <path d="M6 3v8M3 3v5a3 3 0 0 0 6 0V3M6 11v10" />
      <path d="M15 3v8h5M20 3v18" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h12v4" />
      <path d="M3 8h14" />
      <path d="M16 13h5v4h-5a2 2 0 0 1 0-4Z" />
    </>
  ),
  'shopping-cart': (
    <>
      <path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H7" />
      <circle cx="10" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
    </>
  ),
}

export function Icon({ name, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {iconPaths[name]}
    </svg>
  )
}

export function CertisLogo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg
        className="certis-mark"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M24 3.5c4.3 0 15.6 11.3 15.6 15.6S28.3 44.5 24 44.5 8.4 33.2 8.4 28.9 19.7 3.5 24 3.5Z"
          stroke="currentColor"
          strokeWidth="2.4"
        />
        <circle cx="19" cy="15" r="4.5" fill="#13bf8b" />
        <path
          d="M25.5 30.5h8"
          stroke="#d0a04e"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span>Certis</span>
    </div>
  )
}
