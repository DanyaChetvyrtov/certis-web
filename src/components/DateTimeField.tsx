import {useEffect, useMemo, useRef, useState} from 'react'
import {Icon} from './Icons'
import {useLanguage} from '../i18n/useLanguage'
import './DateTimeField.css'

type Mode = 'date' | 'datetime' | 'month'

type Props = {
    id: string
    value: string
    mode?: Mode
    min?: string
    max?: string
    disabled?: boolean
    invalid?: boolean
    describedBy?: string
    onChange: (value: string) => void
}

const pad = (value: number) => String(value).padStart(2, '0')

const dateValue = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

const monthValue = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}`

const parseLocalDate = (value: string): Date | null => {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number)
    if (!year || !month || !day) return null
    const date = new Date(year, month - 1, day)
    return date.getFullYear() === year
        && date.getMonth() === month - 1
        && date.getDate() === day
        ? date
        : null
}

const parseLocalMonth = (value: string): Date | null => {
    const [year, month] = value.slice(0, 7).split('-').map(Number)
    if (!year || !month || month < 1 || month > 12) return null
    return new Date(year, month - 1, 1)
}

const sameDay = (first: Date, second: Date) =>
    first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate()

const sameMonth = (first: Date, second: Date) =>
    first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()

const clampDate = (value: string, min?: string, max?: string) => {
    const date = value.slice(0, 10)
    if (min && date < min.slice(0, 10)) return min.slice(0, 10)
    if (max && date > max.slice(0, 10)) return max.slice(0, 10)
    return date
}

const clampMonth = (value: string, min?: string, max?: string) => {
    const month = value.slice(0, 7)
    if (min && month < min.slice(0, 7)) return min.slice(0, 7)
    if (max && month > max.slice(0, 7)) return max.slice(0, 7)
    return month
}

export function DateTimeField({
    id,
    value,
    mode = 'date',
    min,
    max,
    disabled,
    invalid,
    describedBy,
    onChange,
}: Props) {
    const {locale} = useLanguage()
    const wrapperRef = useRef<HTMLDivElement>(null)
    const [open, setOpen] = useState(false)
    const selectedDate = mode === 'month'
        ? parseLocalMonth(value)
        : parseLocalDate(value)
    const [visibleMonth, setVisibleMonth] = useState(() => {
        const initial = selectedDate ?? new Date()
        return new Date(initial.getFullYear(), initial.getMonth(), 1)
    })
    const [timeDraft, setTimeDraft] = useState(() => value.slice(11, 16) || '12:00')

    useEffect(() => {
        if (!open) return
        const handlePointer = (event: MouseEvent) => {
            if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
        }
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', handlePointer)
        document.addEventListener('keydown', handleKey)
        return () => {
            document.removeEventListener('mousedown', handlePointer)
            document.removeEventListener('keydown', handleKey)
        }
    }, [open])

    const syncDraftsFromValue = () => {
        const nextDate = mode === 'month'
            ? parseLocalMonth(value)
            : parseLocalDate(value)

        if (nextDate) {
            setVisibleMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1))
        }

        if (mode === 'datetime') {
            setTimeDraft(value.slice(11, 16) || '12:00')
        }
    }

    const openPicker = () => {
        if (disabled) return
        syncDraftsFromValue()
        setOpen(true)
    }

    const togglePicker = () => {
        if (disabled) return
        if (open) {
            setOpen(false)
            return
        }
        syncDraftsFromValue()
        setOpen(true)
    }

    const days = useMemo(() => {
        if (mode === 'month') return []
        const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
        const mondayOffset = (first.getDay() + 6) % 7
        const start = new Date(first)
        start.setDate(first.getDate() - mondayOffset)
        return Array.from({length: 42}, (_, index) => {
            const day = new Date(start)
            day.setDate(start.getDate() + index)
            return day
        })
    }, [mode, visibleMonth])

    const displayValue = useMemo(() => {
        if (!selectedDate) return ''
        if (mode === 'month') {
            return selectedDate.toLocaleDateString(locale, {
                month: 'long',
                year: 'numeric',
            })
        }
        const date = selectedDate.toLocaleDateString(locale, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
        if (mode === 'date') return date
        const time = value.slice(11, 16)
        return time ? `${date} · ${time}` : date
    }, [locale, mode, selectedDate, value])

    const commitDate = (date: Date) => {
        const nextDate = clampDate(dateValue(date), min, max)
        if (mode === 'datetime') {
            onChange(`${nextDate}T${timeDraft || '12:00'}`)
        } else {
            onChange(nextDate)
            setOpen(false)
        }
    }

    const commitMonth = (date: Date) => {
        onChange(clampMonth(monthValue(date), min, max))
        setOpen(false)
    }

    const commitTime = (nextTime: string) => {
        setTimeDraft(nextTime)
        if (/^([01]\d|2[0-3]):[0-5]\d$/.test(nextTime)) {
            const date = selectedDate ? dateValue(selectedDate) : dateValue(new Date())
            onChange(`${clampDate(date, min, max)}T${nextTime}`)
        }
    }

    const commitRawValue = (nextValue: string) => {
        if (mode === 'month') {
            if (parseLocalMonth(nextValue)) {
                onChange(clampMonth(nextValue, min, max))
            }
            return
        }

        if (!parseLocalDate(nextValue)) return

        const nextDate = clampDate(nextValue, min, max)
        if (mode === 'date') {
            onChange(nextDate)
            return
        }

        const nextTime = nextValue.slice(11, 16) || timeDraft || '12:00'
        if (/^([01]\d|2[0-3]):[0-5]\d$/.test(nextTime)) {
            setTimeDraft(nextTime)
            onChange(`${nextDate}T${nextTime}`)
        }
    }

    const today = new Date()
    const minDate = min?.slice(0, 10)
    const maxDate = max?.slice(0, 10)
    const minMonth = min?.slice(0, 7)
    const maxMonth = max?.slice(0, 7)
    const monthLabel = mode === 'month'
        ? String(visibleMonth.getFullYear())
        : visibleMonth.toLocaleDateString(locale, {
            month: 'long',
            year: 'numeric',
        })
    const weekdayLabels = Array.from({length: 7}, (_, index) => {
        const monday = new Date(2024, 0, 1 + index)
        return monday.toLocaleDateString(locale, {weekday: 'short'}).slice(0, 2)
    })
    const monthOptions = Array.from({length: 12}, (_, month) => {
        const date = new Date(visibleMonth.getFullYear(), month, 1)
        return {
            date,
            label: date.toLocaleDateString(locale, {month: 'short'}),
        }
    })

    return (
        <div ref={wrapperRef} className="certis-date-time-field">
            <div className={invalid ? 'certis-date-time-control invalid' : 'certis-date-time-control'}>
                <Icon name="calendar"/>
                <input
                    id={id}
                    type="text"
                    readOnly
                    value={displayValue}
                    disabled={disabled}
                    aria-invalid={invalid}
                    aria-describedby={describedBy}
                    placeholder={
                        mode === 'datetime'
                            ? 'Select date and time'
                            : mode === 'month'
                                ? 'Select month'
                                : 'Select date'
                    }
                    onChange={(event) => commitRawValue(event.target.value)}
                    onClick={openPicker}
                />
                <button
                    type="button"
                    className="certis-date-time-trigger"
                    aria-label={mode === 'month' ? 'Open month picker' : 'Open calendar'}
                    aria-expanded={open}
                    disabled={disabled}
                    onClick={togglePicker}
                >
                    <Icon name="chevron-down"/>
                </button>
            </div>

            {open && (
                <div
                    className="certis-date-time-popover"
                    role="dialog"
                    aria-label={mode === 'month' ? 'Month picker' : 'Calendar'}
                >
                    <header>
                        <strong>{monthLabel}</strong>
                        <div>
                            <button
                                type="button"
                                aria-label={mode === 'month' ? 'Previous year' : 'Previous month'}
                                onClick={() => setVisibleMonth((current) => new Date(
                                    current.getFullYear() + (mode === 'month' ? -1 : 0),
                                    current.getMonth() + (mode === 'month' ? 0 : -1),
                                    1,
                                ))}
                            >
                                ‹
                            </button>
                            <button
                                type="button"
                                aria-label={mode === 'month' ? 'Next year' : 'Next month'}
                                onClick={() => setVisibleMonth((current) => new Date(
                                    current.getFullYear() + (mode === 'month' ? 1 : 0),
                                    current.getMonth() + (mode === 'month' ? 0 : 1),
                                    1,
                                ))}
                            >
                                ›
                            </button>
                        </div>
                    </header>

                    {mode === 'month' ? (
                        <div className="certis-month-grid">
                            {monthOptions.map(({date, label}) => {
                                const raw = monthValue(date)
                                const selected = selectedDate ? sameMonth(date, selectedDate) : false
                                const isCurrent = sameMonth(date, today)
                                const blocked = Boolean(
                                    (minMonth && raw < minMonth)
                                    || (maxMonth && raw > maxMonth),
                                )

                                return (
                                    <button
                                        type="button"
                                        key={raw}
                                        className={[
                                            selected ? 'selected' : '',
                                            isCurrent ? 'today' : '',
                                        ].filter(Boolean).join(' ')}
                                        disabled={blocked}
                                        aria-pressed={selected}
                                        onClick={() => commitMonth(date)}
                                    >
                                        {label}
                                    </button>
                                )
                            })}
                        </div>
                    ) : (
                        <>
                            <div className="certis-calendar-weekdays" aria-hidden="true">
                                {weekdayLabels.map((label) => <span key={label}>{label}</span>)}
                            </div>

                            <div className="certis-calendar-grid">
                                {days.map((day) => {
                                    const raw = dateValue(day)
                                    const outside = day.getMonth() !== visibleMonth.getMonth()
                                    const selected = selectedDate ? sameDay(day, selectedDate) : false
                                    const isToday = sameDay(day, today)
                                    const blocked = Boolean(
                                        (minDate && raw < minDate)
                                        || (maxDate && raw > maxDate),
                                    )
                                    return (
                                        <button
                                            type="button"
                                            key={raw}
                                            className={[
                                                outside ? 'outside' : '',
                                                selected ? 'selected' : '',
                                                isToday ? 'today' : '',
                                            ].filter(Boolean).join(' ')}
                                            disabled={blocked}
                                            aria-pressed={selected}
                                            onClick={() => commitDate(day)}
                                        >
                                            {day.getDate()}
                                        </button>
                                    )
                                })}
                            </div>
                        </>
                    )}

                    {mode === 'datetime' && (
                        <div className="certis-time-row">
                            <span>Time</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={timeDraft}
                                maxLength={5}
                                aria-label="Time"
                                onChange={(event) => commitTime(event.target.value)}
                            />
                        </div>
                    )}

                    <footer>
                        <button
                            type="button"
                            onClick={() => mode === 'month' ? commitMonth(today) : commitDate(today)}
                        >
                            {mode === 'month' ? 'This month' : 'Today'}
                        </button>
                        {mode === 'datetime' && (
                            <button type="button" className="primary" onClick={() => setOpen(false)}>Done</button>
                        )}
                    </footer>
                </div>
            )}
        </div>
    )
}
