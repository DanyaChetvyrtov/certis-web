import type {IconName} from '../../components/Icons'
import type {Currency} from '../../shared/currency'

export const goalIcons = [
    'target',
    'home',
    'briefcase',
    'piggy-bank',
    'gift',
] as const satisfies readonly IconName[]

export const goalColors = [
    {name: 'Emerald', value: '#10B981'},
    {name: 'Gold', value: '#B78B4B'},
    {name: 'Blue', value: '#5982B3'},
    {name: 'Purple', value: '#9165B8'},
    {name: 'Coral', value: '#E6655A'},
] as const

export const goalIconName = (icon: string): IconName => {
    if (icon === 'emergency') return 'target'
    if ((goalIcons as readonly string[]).includes(icon)) return icon as IconName
    return 'target'
}

export const formatGoalMoney = (
    value: number,
    currency: Currency | string,
    locale = 'en-US',
): string => new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
}).format(value)

export const formatGoalMonth = (
    month: string | null,
    locale = 'en-US',
    emptyLabel = 'No target date',
): string => {
    if (!month) return emptyLabel

    return new Intl.DateTimeFormat(locale, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(`${month}-01T00:00:00Z`))
}

export const currentMonth = (): string => new Date().toISOString().slice(0, 7)

export const addMonths = (month: string, amount: number): string => {
    const [year, monthNumber] = month.split('-').map(Number)
    const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1))

    return date.toISOString().slice(0, 7)
}
