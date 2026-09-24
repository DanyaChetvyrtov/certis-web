import {useTranslation} from 'react-i18next'
import {Icon} from '../../../components/Icons'
import {AccountActionMenu} from '../../../features/accounts/components/AccountActionMenu'
import type {Account} from '../../../features/accounts/api/accountsApi'
import {useLanguage} from '../../../i18n/useLanguage'
import {accountIcon, formatAmount, formatDate} from './accountPresentation'

type AccountRowProps = {
    account: Account
    fallbackRestoreFocus: () => void
    onEdit: (account: Account, restoreFocus: () => void) => void
    onCloseAccount: (account: Account, restoreFocus: () => void) => void
}

export function AccountRow({
    account,
    fallbackRestoreFocus,
    onEdit,
    onCloseAccount,
}: AccountRowProps) {
    const {t} = useTranslation()
    const {locale} = useLanguage()
    const isClosed = Boolean(account.closedAt)

    return (
        <article className={isClosed ? 'account-row closed' : 'account-row'}>
            <div className="account-identity">
                <span className={`account-row-icon type-${account.type.toLowerCase()}`}>
                    <Icon name={accountIcon(account.type)}/>
                </span>
                <span>
                    <strong>{account.name}</strong>
                    <small>{t(`accounts.types.${account.type}`)} · {account.currency}</small>
                </span>
            </div>
            <div className="account-balance">
                <strong>{formatAmount(account.balance, account.currency, locale)}</strong>
                <small>{isClosed ? t('accounts.finalBalance') : t('accounts.calculatedBalance')}</small>
            </div>
            <div className="account-timeline">
                <span>{isClosed
                    ? t('accounts.closedAt', {date: formatDate(account.closedAt!, locale)})
                    : t('accounts.createdAt', {date: formatDate(account.createdAt, locale)})}</span>
            </div>
            <div>
                <span className={isClosed ? 'account-status closed' : 'account-status'}>
                    {!isClosed && <i/>}
                    {isClosed ? t('accounts.closed') : t('accounts.active')}
                </span>
            </div>
            {!isClosed && (
                <AccountActionMenu
                    account={account}
                    fallbackRestoreFocus={fallbackRestoreFocus}
                    onEdit={onEdit}
                    onCloseAccount={onCloseAccount}
                />
            )}
        </article>
    )
}
