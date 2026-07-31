import type { ReactNode, SVGProps } from 'react'

type IconName =
  | 'alert'
  | 'arrow-right'
  | 'bank'
  | 'calendar'
  | 'check-circle'
  | 'eye'
  | 'eye-off'
  | 'lock'
  | 'mail'
  | 'piggy-bank'
  | 'shield'
  | 'target'
  | 'user'
  | 'wallet'

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
  'arrow-right': (
    <>
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
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
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4M17 3v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </>
  ),
  'check-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
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
  'piggy-bank': (
    <>
      <path d="M5 10a7 7 0 0 1 12-2h3v5h-2a7 7 0 0 1-2 3v3h-3v-2H8v2H5v-3a6 6 0 0 1-2-4V9h2" />
      <path d="M14 7a4 4 0 0 0-5 0M16 11h.01" />
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
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h12v4" />
      <path d="M3 8h14" />
      <path d="M16 13h5v4h-5a2 2 0 0 1 0-4Z" />
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
