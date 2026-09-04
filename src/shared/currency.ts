export const currencies = ['RUB', 'EUR', 'USD'] as const

export type Currency = (typeof currencies)[number]

export const currencyLabels: Record<Currency, string> = {
    RUB: 'Russian ruble',
    EUR: 'Euro',
    USD: 'US dollar',
}
