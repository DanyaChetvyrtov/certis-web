import type {CSSProperties} from 'react'
import type {TFunction} from 'i18next'
import type {Currency} from '../../../features/accounts/api/accountsApi'
import type {Transaction} from '../../../features/transactions/api/transactionsApi'
import type {PeriodRange} from '../model/selectors'

type TransactionAccentStyle = CSSProperties & {
    '--transaction-accent': string
}

const currencySymbols: Record<Currency, string> = {
    RUB: '₽',
    EUR: '€',
    USD: '$',
}

export const formatPeriodLabel = (
    range: PeriodRange,
    locale: string,
    t: TFunction,
): string => {
    if (!range.start || !range.end) {
        return t('transactions.periods.ALL_TIME')
    }

    const sameMonth =
        range.start.getFullYear() === range.end.getFullYear()
        && range.start.getMonth() === range.end.getMonth()

    if (sameMonth) {
        return `${range.start.toLocaleDateString(locale, {
            month: 'short',
        })} ${range.start.getDate()}–${range.end.getDate()}, ${range.end.getFullYear()}`
    }

    return `${range.start.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
    })} – ${range.end.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })}`
}

export const formatMoney = (
    amount: number,
    currency: Currency,
    locale: string,
    showPositiveSign = false,
): string => {
    const absoluteAmount = Math.abs(amount)
    const formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(absoluteAmount)
    const sign = amount < 0
        ? '−'
        : showPositiveSign && amount > 0
            ? '+'
            : ''

    return `${sign}${currencySymbols[currency]}${formatted}`
}

export const formatMoneyMap = (
    amounts: Map<Currency, number>,
    locale: string,
    fallbackCurrency?: Currency,
    showPositiveSign = false,
): string => {
    if (amounts.size === 0) {
        return fallbackCurrency
            ? formatMoney(0, fallbackCurrency, locale)
            : '—'
    }

    return Array.from(amounts.entries())
        .sort(([first], [second]) =>
            first.localeCompare(second),
        )
        .map(([currency, amount]) =>
            formatMoney(
                amount,
                currency,
                locale,
                showPositiveSign,
            ),
        )
        .join(' · ')
}

const isSameDay = (
    first: Date,
    second: Date,
): boolean =>
    first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate()

export const formatGroupHeading = (
    dateValue: string,
    today: Date,
    locale: string,
    t: TFunction,
): string => {
    const date = new Date(dateValue)
    const yesterday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 1,
    )
    const formattedDate = date.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
    })

    if (isSameDay(date, today)) {
        return t('transactions.today', {date: formattedDate})
    }

    if (isSameDay(date, yesterday)) {
        return t('transactions.yesterday', {date: formattedDate})
    }

    return formattedDate
}

export const transactionTitle = (
    transaction: Transaction,
    t: TFunction,
): string =>
    transaction.merchant?.trim()
    || (transaction.type === 'INCOME'
        ? t('transactions.incomeTransaction')
        : t('transactions.expenseTransaction'))

export const accentStyle = (
    color: string,
): TransactionAccentStyle => ({
    '--transaction-accent': color,
})

