import type {IconName} from '../../../components/Icons'

export type ActiveWorkspacePage =
    | 'dashboard'
    | 'accounts'
    | 'transactions'
    | 'budgets'
    | 'goals'
    | 'categories'

type NavigationItem = {
    page: ActiveWorkspacePage
    path: string
    labelKey: string
    icon: IconName
    mobile: 'primary' | 'overflow'
}

export const navigationItems: readonly NavigationItem[] = [
    {page: 'dashboard', path: '/dashboard', labelKey: 'navigation.dashboard', icon: 'dashboard', mobile: 'primary'},
    {page: 'accounts', path: '/accounts', labelKey: 'navigation.accounts', icon: 'wallet', mobile: 'primary'},
    {page: 'transactions', path: '/transactions', labelKey: 'navigation.transactions', icon: 'receipt', mobile: 'primary'},
    {page: 'budgets', path: '/budgets', labelKey: 'navigation.budgets', icon: 'gauge', mobile: 'primary'},
    {page: 'goals', path: '/goals', labelKey: 'navigation.goals', icon: 'target', mobile: 'overflow'},
    {page: 'categories', path: '/categories', labelKey: 'navigation.categories', icon: 'tag', mobile: 'overflow'},
]

export const mobilePrimaryItems = navigationItems.filter((item) => item.mobile === 'primary')
export const mobileOverflowItems = navigationItems.filter((item) => item.mobile === 'overflow')

export const navigationDestination = (
    item: NavigationItem,
    transactionsDestination: string,
): string => item.page === 'transactions' ? transactionsDestination : item.path
