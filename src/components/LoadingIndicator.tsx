import './LoadingIndicator.css'

type LoadingIndicatorProps = {
    className?: string
    label: string
    layout?: 'inline' | 'panel'
    showLabel?: boolean
    size?: 'small' | 'medium' | 'large'
    tone?: 'dark' | 'light'
}

export function LoadingIndicator({
    className,
    label,
    layout = 'inline',
    showLabel = false,
    size = 'small',
    tone = 'dark',
}: LoadingIndicatorProps) {
    const classes = [
        'loading-indicator',
        `loading-indicator-${layout}`,
        `loading-indicator-${size}`,
        `loading-indicator-${tone}`,
        className,
    ].filter(Boolean).join(' ')

    return (
        <span
            className={classes}
            role="status"
            aria-live="polite"
        >
            <span
                className="loading-indicator-spinner"
                aria-hidden="true"
            />
            <span
                className={
                    showLabel
                        ? 'loading-indicator-label'
                        : 'loading-indicator-label loading-indicator-label-hidden'
                }
            >
                {label}
            </span>
        </span>
    )
}
