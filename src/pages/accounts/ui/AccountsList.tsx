import {useMemo, useState} from 'react'
import type {RefObject} from 'react'
import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import {Select, SelectOption} from '../../../components/Select'
import type {Account} from '../../../features/accounts/api/accountsApi'
import {useLanguage} from '../../../i18n/useLanguage'
import {selectVisibleAccounts} from '../model/accountSelectors'
import type {AccountFilter, AccountSort} from '../model/accountSelectors'
import type {AccountsLoadState} from '../model/useAccountsData'
import {AccountRow} from './AccountRow'

type AccountsListProps = {
    accounts: Account[]
    activeCount: number
    closedCount: number
    loadState: AccountsLoadState
    loadError: string
    searchInputRef: RefObject<HTMLInputElement | null>
    headingRef: RefObject<HTMLHeadingElement | null>
    onRetry: () => Promise<void>
    onNewAccount: () => void
    onEdit: (account: Account, restoreFocus: () => void) => void
    onCloseAccount: (account: Account, restoreFocus: () => void) => void
}

export function AccountsList({
    accounts,
    activeCount,
    closedCount,
    loadState,
    loadError,
    searchInputRef,
    headingRef,
    onRetry,
    onNewAccount,
    onEdit,
    onCloseAccount,
}: AccountsListProps) {
    const {t} = useTranslation()
    const {locale} = useLanguage()
    const [filter, setFilter] = useState<AccountFilter>('all')
    const [sort, setSort] = useState<AccountSort>('newest')
    const [searchQuery, setSearchQuery] = useState('')
    const visibleAccounts = useMemo(() => selectVisibleAccounts(
        accounts, filter, sort, searchQuery, locale,
        (type) => t(`accounts.types.${type}`),
    ), [accounts, filter, locale, searchQuery, sort, t])

    const focusHeading = () => headingRef.current?.focus()

    return (
        <section className="accounts-list-card">
            <div className="accounts-list-heading">
                <div>
                    <h2 ref={headingRef} tabIndex={-1}>{t('accounts.yourAccounts')}</h2>
                    <p>{t('accounts.balancesHint')}</p>
                </div>
            </div>

            <div className="accounts-list-toolbar">
                <div className="account-filter-tabs" role="group" aria-label={t('accounts.filterLabel')}>
                    <button
                        className={filter === 'all' ? 'active' : undefined}
                        type="button"
                        onClick={() => setFilter('all')}
                    >
                        {t('accounts.all')} · {accounts.length}
                    </button>
                    <button
                        className={filter === 'active' ? 'active' : undefined}
                        type="button"
                        onClick={() => setFilter('active')}
                    >
                        {t('accounts.active')} · {activeCount}
                    </button>
                    <button
                        className={filter === 'closed' ? 'active' : undefined}
                        type="button"
                        onClick={() => setFilter('closed')}
                    >
                        {t('accounts.closed')} · {closedCount}
                    </button>
                </div>

                <div className="account-search-sort">
                    <label className="account-search-field">
                        <Icon name="search"/>
                        <span className="sr-only">{t('accounts.search')}</span>
                        <input
                            ref={searchInputRef}
                            type="search"
                            placeholder={t('accounts.search')}
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                        />
                    </label>
                    <label className="account-sort-field">
                        <span className="sr-only">{t('accounts.sort')}</span>
                        <Select
                            value={sort}
                            onValueChange={(value) => setSort(value as AccountSort)}
                        >
                            <SelectOption value="newest">{t('accounts.newest')}</SelectOption>
                            <SelectOption value="name">{t('accounts.name')}</SelectOption>
                            <SelectOption value="balance">{t('accounts.balance')}</SelectOption>
                        </Select>
                    </label>
                </div>
            </div>

            <div className="account-table-head" aria-hidden="true">
                <span>{t('accounts.account')}</span>
                <span>{t('accounts.currentBalance')}</span>
                <span>{t('accounts.timeline')}</span>
                <span>{t('accounts.status')}</span>
                <span/>
            </div>

            {loadState === 'loading' && (
                <div className="account-loading-state" aria-label={t('accounts.loading')}>
                    {[0, 1, 2].map((item) => <span key={item}/>)}
                </div>
            )}

            {loadState === 'error' && (
                <div className="account-empty-state" role="alert">
                    <span><Icon name="alert"/></span>
                    <h3>{t('accounts.loadTitle')}</h3>
                    <p>{loadError}</p>
                    <button type="button" onClick={() => void onRetry()}>{t('accounts.tryAgain')}</button>
                </div>
            )}

            {loadState === 'ready' && visibleAccounts.length === 0 && (
                <div className="account-empty-state">
                    <span><Icon name={accounts.length === 0 ? 'wallet' : 'search'}/></span>
                    <h3>{accounts.length === 0 ? t('accounts.createFirst') : t('accounts.noResults')}</h3>
                    <p>{accounts.length === 0
                        ? t('accounts.createFirstDescription')
                        : t('accounts.noResultsDescription')}</p>
                    {accounts.length === 0 && (
                        <button type="button" onClick={onNewAccount}>{t('accounts.addAccount')}</button>
                    )}
                </div>
            )}

            {loadState === 'ready' && visibleAccounts.length > 0 && (
                <div className="account-rows">
                    {visibleAccounts.map((account) => (
                        <AccountRow
                            key={account.id}
                            account={account}
                            fallbackRestoreFocus={focusHeading}
                            onEdit={onEdit}
                            onCloseAccount={onCloseAccount}
                        />
                    ))}
                </div>
            )}
        </section>
    )
}
