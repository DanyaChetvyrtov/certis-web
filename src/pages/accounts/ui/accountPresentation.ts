import type {AccountType, Currency} from '../../../features/accounts/api/accountsApi'

export const typeColors: Record<AccountType, string> = {
    CARD: '#10b889',
    BANK: '#b89052',
    CASH: '#102647',
    INVESTMENT: '#6572c9',
}

export const accountIcon = (type: AccountType) => {
    if (type === 'CARD') return 'card'
    if (type === 'CASH') return 'cash'
    if (type === 'BANK') return 'bank'
    return 'gauge'
}

export const formatAmount = (
    amount: number,
    currency: Currency,
    locale: string,
    maximumFractionDigits = 2,
) => new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: maximumFractionDigits,
    maximumFractionDigits,
}).format(amount)

export const formatDate = (date: string, locale: string) => new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
}).format(new Date(date))
